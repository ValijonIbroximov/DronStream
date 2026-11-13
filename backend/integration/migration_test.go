//go:build integration

package integration

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// TestMigrationFromV1 uses the real released 1.0.0 binary (dist/) to create a
// schema-v1 database, then starts the current build on it.
func TestMigrationFromV1(t *testing.T) {
	old := os.Getenv("DS_OLD_BIN")
	if old == "" {
		old = filepath.Join(repoRoot(), "dist", "DronStream-1.0.0-win64", "app", "1.0.0", "dronstream.exe")
	}
	if _, err := os.Stat(old); err != nil {
		t.Skip("1.0.0 package not found: " + old)
	}
	oldDir := t.TempDir()
	b, _ := os.ReadFile(old)
	oldBin := filepath.Join(oldDir, "dronstream.exe")
	os.WriteFile(oldBin, b, 0o755)
	mtx, _ := os.ReadFile(filepath.Join(repoRoot(), ".tools", "mediamtx", "mediamtx.exe"))
	os.MkdirAll(filepath.Join(oldDir, "mediamtx"), 0o755)
	os.WriteFile(filepath.Join(oldDir, "mediamtx", "mediamtx.exe"), mtx, 0o755)

	root := t.TempDir()
	os.MkdirAll(filepath.Join(root, "config"), 0o700)
	os.WriteFile(filepath.Join(root, "config", "dronstream.yaml"), []byte(testConfig(120)), 0o600)

	// ---- v1 data with the old binary ----
	s1 := startServer(t, oldBin, root)
	admin := newClient(t, "admin")
	tok, _ := os.ReadFile(filepath.Join(root, "data", "runtime", "setup-token.txt"))
	_, body := admin.do("POST", "/api/setup", map[string]string{"setupToken": strings.TrimSpace(string(tok)), "username": "boss", "password": "Correct-Horse-1"}, nil)
	admin.absorbSession(body)
	admin.waitOnline("demo-a", true, 20*time.Second)
	demoA, demoB := admin.streams()["demo-a"].ID, admin.streams()["demo-b"].ID
	admin.mustJSON("POST", "/api/admin/users", map[string]string{"username": "veteran", "displayName": "Veteran", "password": "Veteran-Pass-1", "role": "user"}, nil)
	vid := admin.userID("veteran")
	exp := time.Now().Add(48 * time.Hour).UnixMilli()
	admin.grant("user", vid, []int64{demoA}, &exp)
	admin.grant("user", vid, []int64{demoB}, nil)
	admin.revoke("user", vid, demoB) // revoked v1 permission must stay revoked
	os.Setenv("DRONSTREAM_BACKUP_PASSPHRASE", "Migration-Backup-Pass-1")
	defer os.Unsetenv("DRONSTREAM_BACKUP_PASSPHRASE")
	v1bk := filepath.Join(t.TempDir(), "pre-update-v1.dsbak")
	if out, err := exec.Command(oldBin, "backup", "--root", root, "--out", v1bk).CombinedOutput(); err != nil {
		t.Fatalf("v1 backup: %v %s", err, out)
	}
	s1.stop()

	// ---- current build migrates ----
	bin := buildServer(t)
	s2 := startServer(t, bin, root)
	vc := newClient(t, "veteran")
	if vc.login("veteran", "Correct-Horse-1") == 200 {
		t.Fatal("wrong password accepted")
	}
	if vc.login("veteran", "Veteran-Pass-1") != 200 {
		t.Fatal("v1 account lost after migration")
	}
	var lib struct {
		Items []struct {
			Type     string
			StreamID int64
			Until    int64
		}
	}
	vc.mustJSON("GET", "/api/library", nil, &lib)
	if len(lib.Items) != 1 || lib.Items[0].StreamID != demoA || lib.Items[0].Until == 0 || lib.Items[0].Until > exp {
		t.Fatalf("v1 permission not preserved: %+v", lib.Items)
	}
	v := vc.watch(demoA, "mig")
	v.close()
	if _, st, _ := vc.ticket(demoB, "x"); st != 403 {
		t.Fatal("revoked v1 permission became active")
	}
	ents, _ := filepath.Glob(filepath.Join(root, "data", "backups", "pre-migration-schema-v1-*.db"))
	if len(ents) != 1 {
		t.Fatal("no automatic pre-migration copy")
	}
	a2 := newClient(t, "admin2")
	a2.login("boss", "Correct-Horse-1")
	_, audit := a2.do("GET", "/api/admin/audit?action=schema_migrate", nil, nil)
	if !strings.Contains(string(audit), "v1-\\u003ev3") && !strings.Contains(string(audit), "v1->v3") {
		t.Fatalf("migration not audited: %s", audit)
	}
	s2.stop()
	record("migration_v1_to_v2_accounts_permissions", "PASS (real 1.0.0 database)")

	// ---- rollback policy: old binary must refuse the migrated database ----
	cmd := exec.Command(oldBin, "run", "--root", root)
	out, _ := cmd.CombinedOutput()
	if !strings.Contains(string(out), "newer than this program") {
		t.Fatalf("old binary did not refuse schema v2: %s", out)
	}
	// ... and works again after restoring the pre-update v1 backup
	if out, err := exec.Command(oldBin, "restore", "--root", root, "--in", v1bk, "--force").CombinedOutput(); err != nil {
		t.Fatalf("v1 restore: %v %s", err, out)
	}
	exec.Command(oldBin, "activate", "--root", root).Run()
	s3 := startServer(t, oldBin, root)
	vc2 := newClient(t, "veteran2")
	if vc2.login("veteran", "Veteran-Pass-1") != 200 {
		t.Fatal("old binary after backup restore: login failed")
	}
	if _, st, _ := vc2.ticket(demoA, "r"); st != 200 {
		t.Fatalf("old binary after restore: permission missing (%d)", st)
	}
	s3.stop()
	record("rollback_old_binary_refuses_v2_and_works_after_v1_backup_restore", "PASS")
}
