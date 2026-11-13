package core

import (
	"context"
	"io"
	"log/slog"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"dronstream/internal/config"
	"dronstream/internal/store"
)

type fakeEnforcer struct {
	svc   *Service
	mu    sync.Mutex
	kicks map[string]string
	live  map[string]bool // mtx ids currently "connected"
	calls atomic.Int64
}

// EnforceNow emulates the reconciler: every live session not authorised is "kicked".
func (f *fakeEnforcer) EnforceNow(ctx context.Context, why string) {
	f.calls.Add(1)
	f.mu.Lock()
	defer f.mu.Unlock()
	sys, _ := f.svc.State(ctx)
	ms, _ := f.svc.LiveMediaSessions(ctx)
	for _, m := range ms {
		if d := f.svc.AuthorizeView(ctx, m.WebSessionID, m.StreamID, sys); !d.OK {
			f.kicks[m.MtxID] = d.Reason
			delete(f.live, m.MtxID)
			f.svc.EndMedia(ctx, m, d.Reason)
		}
	}
}
func (f *fakeEnforcer) KickPublisher(context.Context, int64, string) {}

func newSvc(t *testing.T) (*Service, *fakeEnforcer) {
	t.Helper()
	st, err := store.Open(filepath.Join(t.TempDir(), "t.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	cfg := config.Default()
	key := make([]byte, 32)
	s := New(st, &cfg, key, slog.New(slog.NewTextHandler(io.Discard, nil)))
	f := &fakeEnforcer{svc: s, kicks: map[string]string{}, live: map[string]bool{}}
	s.Enforcer = f
	return s, f
}

var admin = Actor{Type: "admin", ID: 9999, Name: "admin"}

func mustUser(t *testing.T, s *Service, name, role string) (int64, *Session, string) {
	t.Helper()
	ctx := context.Background()
	id, err := s.CreateUser(ctx, admin, name, name, "Password-123456", role, false)
	if err != nil {
		t.Fatal(err)
	}
	tok, sess, err := s.Login(ctx, name, "Password-123456", "10.0.0.1", "test")
	if err != nil {
		t.Fatal(err)
	}
	return id, sess, tok
}

func mustStream(t *testing.T, s *Service, slug string) (*Stream, string) {
	st, key, err := s.CreateStream(context.Background(), admin, StreamInput{Name: slug, Slug: slug}, false)
	if err != nil {
		t.Fatal(err)
	}
	return st, key
}

// connect simulates: ticket -> MediaMTX hook (read) with a fresh mtx id.
func connect(t *testing.T, s *Service, sess *Session, st *Stream, mtxID string) error {
	ctx := context.Background()
	tk, err := s.IssueTicket(ctx, sess, st.ID, "tab", "10.0.0.1")
	if err != nil {
		return err
	}
	p, _ := s.MediaPath(st)
	_, err = s.HookRead(ctx, HookRequest{Action: "read", Protocol: "webrtc", Token: tk.Token, Path: p, Query: "ds=" + tk.nonce, ID: mtxID, IP: "10.0.0.1"})
	return err
}

func TestNoDefaultAdminAndSetupOnce(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	if need, _ := s.SetupNeeded(ctx); !need {
		t.Fatal("fresh DB must need setup")
	}
	if _, _, err := s.Login(ctx, "admin", "admin", "", ""); err == nil {
		t.Fatal("admin/admin must not exist")
	}
	if _, err := s.SetupFirstAdmin(ctx, "boss", "", "short", ""); err == nil {
		t.Fatal("weak password accepted")
	}
	if _, err := s.SetupFirstAdmin(ctx, "boss", "", "Long-enough-pw", ""); err != nil {
		t.Fatal(err)
	}
	if _, err := s.SetupFirstAdmin(ctx, "boss2", "", "Long-enough-pw", ""); err == nil {
		t.Fatal("second setup must fail")
	}
}

func TestLoginLockoutAndBlock(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	id, _, _ := mustUser(t, s, "alice", "user")
	for i := 0; i < maxFailedLogins; i++ {
		s.Login(ctx, "alice", "wrong-password", "", "")
	}
	if _, _, err := s.Login(ctx, "alice", "Password-123456", "", ""); err == nil || err.(*Error).Code != "locked" {
		t.Fatalf("expected lockout, got %v", err)
	}
	s.St.DB.Exec(`UPDATE users SET locked_until=0 WHERE id=?`, id)
	_, _, tok := mustUserLogin(t, s, "alice")
	if err := s.SetUserBlocked(ctx, admin, id, true); err != nil {
		t.Fatal(err)
	}
	if _, err := s.SessionByToken(ctx, tok); err == nil {
		t.Fatal("blocked user's session still valid")
	}
	if _, _, err := s.Login(ctx, "alice", "Password-123456", "", ""); err == nil {
		t.Fatal("blocked user logged in")
	}
}

func mustUserLogin(t *testing.T, s *Service, name string) (int64, *Session, string) {
	tok, sess, err := s.Login(context.Background(), name, "Password-123456", "", "")
	if err != nil {
		t.Fatal(err)
	}
	return sess.UserID, sess, tok
}

func TestDefaultDenyAndGrantRevoke(t *testing.T) {
	s, f := newSvc(t)
	ctx := context.Background()
	uid, sess, _ := mustUser(t, s, "alice", "user")
	st, _ := mustStream(t, s, "cam1")
	if _, err := s.IssueTicket(ctx, sess, st.ID, "t", ""); err == nil {
		t.Fatal("ticket without permission")
	}
	if err := s.Grant(ctx, admin, "user", uid, []int64{st.ID}, nil); err != nil {
		t.Fatal(err)
	}
	if err := connect(t, s, sess, st, "m1"); err != nil {
		t.Fatal(err)
	}
	if err := s.Revoke(ctx, admin, "user", uid, st.ID); err != nil {
		t.Fatal(err)
	}
	if f.kicks["m1"] != "permission_revoked" {
		t.Fatalf("expected kick with permission_revoked, got %v", f.kicks)
	}
	if err := connect(t, s, sess, st, "m2"); err == nil {
		t.Fatal("reconnect after revoke allowed")
	}
}

func TestTicketBindingAndReplay(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	ua, sa, _ := mustUser(t, s, "alice", "user")
	_, sb, _ := mustUser(t, s, "bob", "user")
	st, _ := mustStream(t, s, "cam1")
	st2, _ := mustStream(t, s, "cam2")
	s.Grant(ctx, admin, "user", ua, []int64{st.ID}, nil)
	tk, err := s.IssueTicket(ctx, sa, st.ID, "t", "")
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err := s.TicketForProxy(ctx, sb, st.ID, tk.Token); err == nil {
		t.Fatal("other session used ticket")
	}
	if _, _, err := s.TicketForProxy(ctx, sa, st2.ID, tk.Token); err == nil {
		t.Fatal("ticket used for other stream")
	}
	p, _ := s.MediaPath(st)
	r := HookRequest{Action: "read", Protocol: "webrtc", Token: tk.Token, Path: p, Query: "ds=" + tk.nonce, ID: "x1"}
	if _, err := s.HookRead(ctx, r); err != nil {
		t.Fatal(err)
	}
	r.ID = "x2"
	if _, err := s.HookRead(ctx, r); err == nil {
		t.Fatal("ticket replay accepted")
	}
	// wrong nonce burns the ticket
	tk2, _ := s.IssueTicket(ctx, sa, st.ID, "t2", "")
	if _, err := s.HookRead(ctx, HookRequest{Action: "read", Protocol: "webrtc", Token: tk2.Token, Path: p, Query: "ds=bad", ID: "x3"}); err == nil {
		t.Fatal("nonce mismatch accepted")
	}
	if _, err := s.HookRead(ctx, HookRequest{Action: "read", Protocol: "webrtc", Token: tk2.Token, Path: p, Query: "ds=" + tk2.nonce, ID: "x4"}); err == nil {
		t.Fatal("ticket usable after failed attempt")
	}
	// non-webrtc protocols never read
	tk3, _ := s.IssueTicket(ctx, sa, st.ID, "t3", "")
	if _, err := s.HookRead(ctx, HookRequest{Action: "read", Protocol: "hls", Token: tk3.Token, Path: p, Query: "ds=" + tk3.nonce, ID: "x5"}); err == nil {
		t.Fatal("HLS read accepted")
	}
}

func TestPublishKeyRules(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	st, key := mustStream(t, s, "cam1")
	_, key2 := mustStream(t, s, "cam2")
	ok := HookRequest{Action: "publish", Protocol: "rtmp", Path: "live/cam1", Query: "key=" + key, IP: "10.8.0.5"}
	if err := s.HookPublish(ctx, ok); err != nil {
		t.Fatalf("valid publish denied: %v", err)
	}
	cases := map[string]HookRequest{
		"wrong key":      {Action: "publish", Protocol: "rtmp", Path: "live/cam1", Query: "key=nope"},
		"other key":      {Action: "publish", Protocol: "rtmp", Path: "live/cam1", Query: "key=" + key2},
		"other path":     {Action: "publish", Protocol: "rtmp", Path: "live/cam2", Query: "key=" + key},
		"unknown path":   {Action: "publish", Protocol: "rtmp", Path: "live/zzz", Query: "key=" + key},
		"path form":      {Action: "publish", Protocol: "rtmp", Path: "live/cam1/" + key},
		"webrtc publish": {Action: "publish", Protocol: "webrtc", Path: "live/cam1", Token: key, IP: "1.2.3.4"},
		"bad path":       {Action: "publish", Protocol: "rtmp", Path: "../etc", Query: "key=" + key},
	}
	for name, r := range cases {
		if err := s.HookPublish(ctx, r); err == nil {
			t.Errorf("%s: accepted", name)
		}
	}
	// key does not grant read
	p, _ := s.MediaPath(st)
	if _, err := s.HookRead(ctx, HookRequest{Action: "read", Protocol: "webrtc", Token: key, Path: p, ID: "k"}); err == nil {
		t.Fatal("publish key accepted for read")
	}
	// rotate & revoke
	newKey, _ := s.RotateKey(ctx, admin, st.ID)
	if err := s.HookPublish(ctx, ok); err == nil {
		t.Fatal("old key accepted after rotation")
	}
	ok.Query = "key=" + newKey
	if err := s.HookPublish(ctx, ok); err != nil {
		t.Fatal(err)
	}
	s.SetPublishEnabled(ctx, admin, st.ID, false)
	if err := s.HookPublish(ctx, ok); err == nil {
		t.Fatal("publish ban not enforced")
	}
	s.SetPublishEnabled(ctx, admin, st.ID, true)
	s.RevokeKey(ctx, admin, st.ID)
	if err := s.HookPublish(ctx, ok); err == nil {
		t.Fatal("revoked key accepted")
	}
	// busy path
	k3, _ := s.RotateKey(ctx, admin, st.ID)
	s.PathBusy = func(context.Context, string) (bool, error) { return true, nil }
	if err := s.HookPublish(ctx, HookRequest{Action: "publish", Protocol: "rtmp", Path: "live/cam1", Query: "key=" + k3}); err == nil {
		t.Fatal("second publisher accepted on busy path")
	}
}

func TestPathModeKeyNotLeakedAndWorks(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	st, key, err := s.CreateStream(ctx, admin, StreamInput{Name: "p", Slug: "pm", PublishMode: "path"}, false)
	if err != nil {
		t.Fatal(err)
	}
	p, _ := s.MediaPath(st)
	if p != "live/pm/"+key {
		t.Fatalf("path %s", p)
	}
	if err := s.HookPublish(ctx, HookRequest{Action: "publish", Protocol: "rtmp", Path: p}); err != nil {
		t.Fatal(err)
	}
	if err := s.HookPublish(ctx, HookRequest{Action: "publish", Protocol: "rtmp", Path: "live/pm", Query: "key=" + key}); err == nil {
		t.Fatal("query form accepted for path-mode stream")
	}
}

func TestGuestFlow(t *testing.T) {
	s, f := newSvc(t)
	ctx := context.Background()
	st, _ := mustStream(t, s, "cam1")
	st2, _ := mustStream(t, s, "cam2")
	_, g, err := s.CreateGuestRequest(ctx, "  <b>Ali</b>‮ ", "sabab\x00 matn", "1.1.1.1", "ua")
	if err != nil {
		t.Fatal(err)
	}
	if g.Name != "<b>Ali</b>" {
		t.Fatalf("cleaning: %q", g.Name)
	}
	list, _, _ := s.ViewableStreams(ctx, g)
	if len(list) != 0 {
		t.Fatal("pending guest sees streams")
	}
	if _, err := s.IssueTicket(ctx, g, st.ID, "", ""); err == nil {
		t.Fatal("pending guest got ticket")
	}
	until := time.Now().Add(time.Hour).UnixMilli()
	// the approval needs the code from the guest's own screen: without it, or with another code, nothing changes
	for _, bad := range []string{"", "AAA-AAA", g.VerifyCode + "X"} {
		if err := s.ApproveGuest(ctx, admin, g.GuestID, bad, []int64{st.ID}, until, ""); errCode(err) != "verify_code_mismatch" {
			t.Fatalf("approve with code %q: %v", bad, err)
		}
	}
	if list, _, _ := s.ViewableStreams(ctx, g); len(list) != 0 {
		t.Fatal("guest got access after a wrong code")
	}
	if g.VerifyCode == "" {
		t.Fatal("guest session has no verification code")
	}
	if err := s.ApproveGuest(ctx, admin, g.GuestID, " "+strings.ToLower(g.VerifyCode)+" ", []int64{st.ID}, until, ""); err != nil {
		t.Fatal(err)
	}
	if err := connect(t, s, g, st, "g1"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.IssueTicket(ctx, g, st2.ID, "", ""); err == nil {
		t.Fatal("guest got non-approved stream")
	}
	if err := s.EndGuest(ctx, admin, g.GuestID); err != nil {
		t.Fatal(err)
	}
	if f.kicks["g1"] == "" {
		t.Fatal("guest media not cut on end")
	}
	// another browser = new request, not approved
	_, g2, _ := s.CreateGuestRequest(ctx, "Ali", "yana", "1.1.1.1", "ua")
	if _, err := s.IssueTicket(ctx, g2, st.ID, "", ""); err == nil {
		t.Fatal("new guest session inherited approval")
	}
}

func TestExpiryAndLease(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	uid, sess, _ := mustUser(t, s, "alice", "user")
	st, _ := mustStream(t, s, "cam1")
	exp := time.Now().Add(30 * time.Second).UnixMilli()
	s.Grant(ctx, admin, "user", uid, []int64{st.ID}, &exp)
	tk, err := s.IssueTicket(ctx, sess, st.ID, "t", "")
	if err != nil {
		t.Fatal(err)
	}
	if tk.LeaseUntil > exp {
		t.Fatal("lease beyond permission expiry")
	}
	p, _ := s.MediaPath(st)
	lease, err := s.HookRead(ctx, HookRequest{Action: "read", Protocol: "webrtc", Token: tk.Token, Path: p, Query: "ds=" + tk.nonce, ID: "e1"})
	if err != nil || lease > exp {
		t.Fatalf("lease %d exp %d err %v", lease, exp, err)
	}
	// travel past expiry
	s.Now = func() time.Time { return time.UnixMilli(exp + 1) }
	sys, _ := s.State(ctx)
	if d := s.AuthorizeView(ctx, sess.ID, st.ID, sys); d.OK || d.Reason != "permission_expired" {
		t.Fatalf("after expiry: %+v", d)
	}
}

// TestRevokeConnectRace: many concurrent connect/revoke pairs; after both
// finish and one enforcement pass, no authorised-looking session may remain.
func TestRevokeConnectRace(t *testing.T) {
	s, f := newSvc(t)
	ctx := context.Background()
	uid, sess, _ := mustUser(t, s, "alice", "user")
	st, _ := mustStream(t, s, "cam1")
	for i := 0; i < 40; i++ {
		s.Grant(ctx, admin, "user", uid, []int64{st.ID}, nil)
		tk, err := s.IssueTicket(ctx, sess, st.ID, "r", "")
		if err != nil {
			t.Fatal(err)
		}
		p, _ := s.MediaPath(st)
		var wg sync.WaitGroup
		wg.Add(2)
		go func() {
			defer wg.Done()
			s.HookRead(ctx, HookRequest{Action: "read", Protocol: "webrtc", Token: tk.Token, Path: p, Query: "ds=" + tk.nonce, ID: "race-" + itoa(int64(i))})
		}()
		go func() {
			defer wg.Done()
			s.Revoke(ctx, admin, "user", uid, st.ID)
		}()
		wg.Wait()
		f.EnforceNow(ctx, "test") // reconciler tick
		live, _ := s.LiveMediaSessions(ctx)
		if len(live) != 0 {
			t.Fatalf("iteration %d: %d unauthorised live sessions remain", i, len(live))
		}
	}
}

func TestEmergencyAndStandby(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	uid, sess, _ := mustUser(t, s, "alice", "user")
	st, key := mustStream(t, s, "cam1")
	s.Grant(ctx, admin, "user", uid, []int64{st.ID}, nil)
	s.SetEmergencyStop(ctx, admin, true)
	if _, err := s.IssueTicket(ctx, sess, st.ID, "", ""); err == nil {
		t.Fatal("ticket during emergency stop")
	}
	s.SetEmergencyStop(ctx, admin, false)
	s.SetInstanceState(ctx, admin, "standby")
	if _, err := s.IssueTicket(ctx, sess, st.ID, "", ""); err == nil {
		t.Fatal("ticket in standby")
	}
	if err := s.HookPublish(ctx, HookRequest{Action: "publish", Protocol: "rtmp", Path: "live/cam1", Query: "key=" + key}); err == nil {
		t.Fatal("publish in standby")
	}
}

func TestSameIPDifferentUsersIndependent(t *testing.T) {
	s, f := newSvc(t)
	ctx := context.Background()
	ua, sa, _ := mustUser(t, s, "alice", "user")
	ub, sb, _ := mustUser(t, s, "bob", "user") // both from 10.0.0.1
	st, _ := mustStream(t, s, "cam1")
	s.Grant(ctx, admin, "user", ua, []int64{st.ID}, nil)
	s.Grant(ctx, admin, "user", ub, []int64{st.ID}, nil)
	connect(t, s, sa, st, "a")
	connect(t, s, sb, st, "b")
	s.Revoke(ctx, admin, "user", ub, st.ID)
	if f.kicks["b"] == "" || f.kicks["a"] != "" {
		t.Fatalf("selective cut failed: %v", f.kicks)
	}
}

func TestSessionLimit(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	s.Cfg.Media.MaxPerUser = 2
	uid, sess, _ := mustUser(t, s, "alice", "user")
	st, _ := mustStream(t, s, "cam1")
	st2, _ := mustStream(t, s, "cam2")
	st3, _ := mustStream(t, s, "cam3")
	s.Grant(ctx, admin, "user", uid, []int64{st.ID, st2.ID, st3.ID}, nil)
	if err := connect(t, s, sess, st, "1"); err != nil {
		t.Fatal(err)
	}
	if err := connect(t, s, sess, st2, "2"); err != nil {
		t.Fatal(err)
	}
	if err := connect(t, s, sess, st3, "3"); err == nil {
		t.Fatal("limit not enforced")
	}
}

func TestAuditRetention(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	s.Cfg.Security.AuditRetainDays = 1
	s.St.DB.Exec(`INSERT INTO audit_log(ts,actor_type,action) VALUES(?,?,?)`, time.Now().Add(-48*time.Hour).UnixMilli(), "system", "old")
	s.Audit(ctx, System, "new", "", nil)
	if err := s.Cleanup(ctx); err != nil {
		t.Fatal(err)
	}
	var n int
	s.St.DB.QueryRow(`SELECT count(*) FROM audit_log WHERE action='old'`).Scan(&n)
	if n != 0 {
		t.Fatal("old audit not purged")
	}
	s.St.DB.QueryRow(`SELECT count(*) FROM audit_log WHERE action='new'`).Scan(&n)
	if n != 1 {
		t.Fatal("new audit purged")
	}
}
