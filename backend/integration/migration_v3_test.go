//go:build integration

package integration

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	_ "modernc.org/sqlite"
)

// TestMigrationFromV2 uses the real released 1.1.0 binary (dist/) in which a
// special link opened video without any approval. After the upgrade such a
// browser session must hold NO access until an administrator approves it
// (the stricter policy is applied to existing sessions too), and the
// automatic pre-migration copy must exist.
func TestMigrationFromV2(t *testing.T) {
	old := os.Getenv("DS_V2_BIN")
	if old == "" {
		old = filepath.Join(repoRoot(), "dist", "DronStream-1.1.0-win64", "app", "1.1.0", "dronstream.exe")
	}
	if _, err := os.Stat(old); err != nil {
		t.Skip("1.1.0 package not found: " + old)
	}
	oldDir := t.TempDir()
	b, _ := os.ReadFile(old)
	oldBin := filepath.Join(oldDir, "dronstream.exe")
	os.WriteFile(oldBin, b, 0o755)
	mtxb, _ := os.ReadFile(defaultMediaMTX())
	os.MkdirAll(filepath.Join(oldDir, "mediamtx"), 0o755)
	os.WriteFile(filepath.Join(oldDir, "mediamtx", "mediamtx.exe"), mtxb, 0o755)

	root := t.TempDir()
	os.MkdirAll(filepath.Join(root, "config"), 0o700)
	os.WriteFile(filepath.Join(root, "config", "dronstream.yaml"), []byte(testConfig(120)), 0o600)

	// ---- 1.1.0: a special link opens content immediately ----
	s1 := startServer(t, oldBin, root)
	admin := newClient(t, "admin")
	tok, _ := os.ReadFile(filepath.Join(root, "data", "runtime", "setup-token.txt"))
	_, body := admin.do("POST", "/api/setup", map[string]string{"setupToken": strings.TrimSpace(string(tok)), "username": "boss", "password": "Correct-Horse-1"}, nil)
	admin.absorbSession(body)
	admin.mustJSON("POST", "/api/admin/settings/base-url", map[string]string{"url": "https://dronstream.test:18443"}, nil)
	var txt struct{ ID int64 }
	admin.mustJSON("POST", "/api/admin/contents/text", map[string]string{"title": "Brifing", "body": "maxfiy matn"}, &txt)
	var lr linkResp
	admin.mustJSON("POST", "/api/admin/links", map[string]any{"name": "Eski havola", "preset": "multi", "maxUses": 5, "maxParallel": 5, "sessionMinutes": 600, "objects": []map[string]any{{"type": "content", "id": txt.ID}}}, &lr)
	visitor := newClient(t, "visitor")
	if st, code := visitor.activate(tokenOf(lr.Share.URL), "old-auto-session-0001"); st != 200 {
		t.Fatalf("1.1.0 activation: %d %s", st, code)
	}
	var lib struct{ Items []any }
	visitor.mustJSON("GET", "/api/library", nil, &lib)
	if len(lib.Items) != 1 {
		t.Fatalf("1.1.0 link session should see the text: %d", len(lib.Items))
	}
	// a ONE-TIME link whose single use is consumed by the old version
	var once linkResp
	admin.mustJSON("POST", "/api/admin/links", map[string]any{"name": "Eski bir martalik", "preset": "once", "sessionMinutes": 600, "objects": []map[string]any{{"type": "content", "id": txt.ID}}}, &once)
	onceVisitor := newClient(t, "once-visitor")
	if st, code := onceVisitor.activate(tokenOf(once.Share.URL), "old-once-session-0001"); st != 200 {
		t.Fatalf("1.1.0 one-time activation: %d %s", st, code)
	}
	if n := admin.linkUses(once.Link.ID); n != 1 {
		t.Fatalf("1.1.0 one-time link uses = %d", n)
	}
	s1.stop()

	// ---- current build: same cookie, stricter policy ----
	bin := buildServer(t)
	s2 := startServer(t, bin, root)
	defer s2.stop()
	visitor.mustJSON("GET", "/api/library", nil, &lib)
	if len(lib.Items) != 0 {
		t.Fatalf("after upgrade the old link session still sees %d items without approval", len(lib.Items))
	}
	var me struct {
		Session struct {
			ID         int64
			Approval   string
			VerifyCode string
		}
	}
	visitor.mustJSON("GET", "/api/session", nil, &me)
	if me.Session.Approval != "pending" {
		t.Fatalf("old link session approval after upgrade: %q", me.Session.Approval)
	}
	// the administrator sees it as a request and approves it with the code the
	// migration generated (shown on the visitor's screen)
	a2 := newClient(t, "admin2")
	if a2.login("boss", "Correct-Horse-1") != 200 {
		t.Fatal("admin login after upgrade")
	}
	var reqs []struct{ SessionID int64 }
	a2.mustJSON("GET", "/api/admin/approvals", nil, &reqs)
	if len(reqs) != 2 {
		t.Fatalf("pending requests after upgrade: %+v", reqs)
	}
	if me.Session.VerifyCode == "" {
		t.Fatal("migrated pending session has no verification code")
	}
	if st, b := a2.do("POST", fmt.Sprintf("/api/admin/approvals/%d/approve", me.Session.ID), map[string]string{"verifyCode": me.Session.VerifyCode}, nil); st != 200 {
		t.Fatalf("approve migrated session: %d %s", st, b)
	}
	visitor.mustJSON("GET", "/api/library", nil, &lib)
	if len(lib.Items) != 1 {
		t.Fatalf("approved session sees %d items", len(lib.Items))
	}
	// The old sessions' uses were counted by 1.1.0: approving them again must not
	// count a second use, and the one-time link's own session must still be
	// approvable although the link is "used up" for everybody else.
	if n := a2.linkUses(lr.Link.ID); n != 1 {
		t.Fatalf("multi link uses after re-approval = %d, want 1 (no double counting)", n)
	}
	var onceMe struct {
		Session struct {
			ID         int64
			Approval   string
			VerifyCode string
		}
	}
	onceVisitor.mustJSON("GET", "/api/session", nil, &onceMe)
	if onceMe.Session.Approval != "pending" {
		t.Fatalf("old one-time session after upgrade: %q", onceMe.Session.Approval)
	}
	stranger := newClient(t, "stranger")
	if st, code := stranger.activate(tokenOf(once.Share.URL), "new-browser-after-upgrade-01"); st == 200 || code != "link_used_up" {
		t.Fatalf("a new browser on the used-up one-time link: %d %s", st, code)
	}
	if st, b := a2.do("POST", fmt.Sprintf("/api/admin/approvals/%d/approve", onceMe.Session.ID), map[string]string{"verifyCode": onceMe.Session.VerifyCode}, nil); st != 200 {
		t.Fatalf("approve migrated one-time session: %d %s", st, b)
	}
	onceVisitor.mustJSON("GET", "/api/library", nil, &lib)
	if len(lib.Items) != 1 || a2.linkUses(once.Link.ID) != 1 {
		t.Fatalf("migrated one-time session: items=%d uses=%d (want 1 and 1)", len(lib.Items), a2.linkUses(once.Link.ID))
	}
	record("migration_v2_old_link_sessions_pending_no_double_count", "PASS (real 1.1.0 database)")
	ents, _ := filepath.Glob(filepath.Join(root, "data", "backups", "pre-migration-schema-v2-*.db"))
	if len(ents) != 1 {
		t.Fatalf("pre-migration copy missing: %v", ents)
	}
	db, err := sql.Open("sqlite", ents[0])
	if err != nil {
		t.Fatal(err)
	}
	var v int
	db.QueryRow(`SELECT version FROM schema_version`).Scan(&v)
	db.Close()
	if v != 2 {
		t.Fatalf("pre-migration copy has schema v%d", v)
	}
	record("migration_v2_to_v3_link_sessions_pending", fmt.Sprintf("PASS (1.1.0 da ochiq bo'lgan havola sessiyasi yangilangach %q, kutubxona bo'sh; v2 nusxa saqlangan)", me.Session.Approval))
	_ = time.Second
}
