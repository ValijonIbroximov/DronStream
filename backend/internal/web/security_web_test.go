package web

import (
	"encoding/base32"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"dronstream/internal/config"
	"dronstream/internal/core"
	"dronstream/internal/media"
	"dronstream/internal/secure"
	"dronstream/internal/store"
)

func setupWith(t *testing.T, mod func(*config.Config)) (*httptest.Server, *core.Service) {
	st, err := store.Open(filepath.Join(t.TempDir(), "w.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	cfg := config.Default()
	mod(&cfg)
	if err := cfg.Validate(); err != nil {
		t.Fatal(err)
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	svc := core.New(st, &cfg, make([]byte, 32), log)
	m := media.NewManager(svc, fakeAPI{}, "http://127.0.0.1:1", time.Second, log)
	hub := NewHub()
	svc.Events = hub
	tok := "SETUP"
	s := New(svc, m, hub, &cfg, log, nil, Hooks{CheckSetupToken: func(x string) bool { return x == tok }, ConsumeSetupToken: func() { tok = "" }})
	ts := httptest.NewTLSServer(s.Handler())
	t.Cleanup(ts.Close)
	return ts, svc
}

func TestSecureModeConfigRefusesPublicPlainRTMP(t *testing.T) {
	for listen, ok := range map[string]bool{":1935": false, "0.0.0.0:1935": false, "203.0.113.10:1935": false, "": true, "127.0.0.1:1935": true, "10.8.0.1:1935": true, "192.168.1.5:1935": true, "100.64.0.1:1935": true} {
		c := config.Default()
		c.Security.Mode = "secure"
		c.Media.RTMPListen = listen
		err := c.Validate()
		if ok != (err == nil) {
			t.Errorf("rtmp_listen %q in secure mode: err=%v", listen, err)
		}
	}
	c := config.Default()
	c.Media.RTMPListen = ":1935"
	if err := c.Validate(); err != nil || c.Security.Mode != "standard" {
		t.Errorf("standard mode should keep starting: %v", err)
	}
}

// In secure mode an administrator without TOTP can do nothing but enrol, and
// sensitive actions always need a fresh password+TOTP re-confirmation.
func TestSecureModeAdminMFAGateAndSensitiveActions(t *testing.T) {
	ts, _ := setupWith(t, func(c *config.Config) { c.Security.Mode = "secure"; c.Media.RTMPListen = "" })
	c := &http.Client{Transport: ts.Client().Transport, Jar: newJar()}
	h := map[string]string{"X-DS-Request": "1"}
	resp, body := req(t, c, "POST", ts.URL+"/api/setup", `{"setupToken":"SETUP","username":"boss","password":"Long-enough-1"}`, h)
	if resp.StatusCode != 200 || body["mfaSetupRequired"] != true {
		t.Fatalf("setup: %d %v", resp.StatusCode, body)
	}
	h["X-CSRF-Token"] = body["csrf"].(string)
	for _, p := range []string{"/api/admin/users", "/api/admin/streams", "/api/admin/security-status"} {
		if r, b := req(t, c, "GET", ts.URL+p, "", h); r.StatusCode != 403 || b["code"] != "mfa_setup_required" {
			t.Errorf("%s before TOTP: %d %v", p, r.StatusCode, b)
		}
	}
	// enrol (the login just happened, so this counts as a fresh confirmation)
	r, b := req(t, c, "POST", ts.URL+"/api/me/totp/setup", `{}`, h)
	if r.StatusCode != 200 {
		t.Fatalf("totp setup: %d %v", r.StatusCode, b)
	}
	secret, _ := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(b["secret"].(string))
	if q, _ := b["qr"].(map[string]any); q == nil || !strings.HasPrefix(b["uri"].(string), "otpauth://totp/") {
		t.Fatal("no otpauth QR")
	}
	code := secure.HOTP(secret, uint64(secure.TOTPStepAt(time.Now())), 6)
	r, b = req(t, c, "POST", ts.URL+"/api/me/totp/enable", `{"code":"`+code+`"}`, h)
	if r.StatusCode != 200 {
		t.Fatalf("enable: %d %v", r.StatusCode, b)
	}
	// the gate is evaluated per session: sign in again with password + code
	c2 := &http.Client{Transport: ts.Client().Transport, Jar: newJar()}
	h2 := map[string]string{"X-DS-Request": "1"}
	if r, b := req(t, c2, "POST", ts.URL+"/api/login", `{"username":"boss","password":"Long-enough-1"}`, h2); r.StatusCode != 401 || b["code"] != "mfa_required" {
		t.Fatalf("password alone: %d %v", r.StatusCode, b)
	}
	rec := b["recoveryCodes"].([]any)[0].(string)
	r, b = req(t, c2, "POST", ts.URL+"/api/login", `{"username":"boss","password":"Long-enough-1","otp":"`+rec+`"}`, h2)
	if r.StatusCode != 200 {
		t.Fatalf("login with recovery code: %d %v", r.StatusCode, b)
	}
	h2["X-CSRF-Token"] = b["csrf"].(string)
	if r, b := req(t, c2, "GET", ts.URL+"/api/admin/security-status", "", h2); r.StatusCode != 200 {
		t.Fatalf("admin after TOTP: %d %v", r.StatusCode, b)
	}
	// a fresh login counts as re-confirmation; force an old one by asking the DB
	if r, b := req(t, c2, "POST", ts.URL+"/api/admin/users", `{"username":"vera","password":"Vera-Password-123","role":"user"}`, h2); r.StatusCode != 200 {
		t.Fatalf("sensitive right after login: %d %v", r.StatusCode, b)
	}
}

// Without a fresh re-confirmation, sensitive endpoints refuse; /api/me/reauth fixes it.
func TestSensitiveActionsNeedReauth(t *testing.T) {
	ts, svc := setupWith(t, func(c *config.Config) {})
	c := &http.Client{Transport: ts.Client().Transport, Jar: newJar()}
	h := map[string]string{"X-DS-Request": "1"}
	_, body := req(t, c, "POST", ts.URL+"/api/setup", `{"setupToken":"SETUP","username":"boss","password":"Long-enough-1"}`, h)
	h["X-CSRF-Token"] = body["csrf"].(string)
	// move the clock past the re-confirmation window
	svc.Now = func() time.Time { return time.Now().Add(core.ReauthWindow + time.Minute) }
	for _, rq := range [][3]string{
		{"POST", "/api/admin/users", `{"username":"vera","password":"Vera-Password-123","role":"user"}`},
		{"GET", "/api/admin/streams/1/key", ""},
		{"POST", "/api/admin/streams/1/rotate-key", `{}`},
		{"POST", "/api/admin/system/instance", `{"state":"standby"}`},
	} {
		if r, b := req(t, c, rq[0], ts.URL+rq[1], rq[2], h); r.StatusCode != 403 || b["code"] != "reauth_required" {
			t.Errorf("%s %s without reauth: %d %v", rq[0], rq[1], r.StatusCode, b)
		}
	}
	if r, _ := req(t, c, "POST", ts.URL+"/api/me/reauth", `{"password":"wrong-password"}`, h); r.StatusCode != 403 {
		t.Fatalf("wrong reauth password: %d", r.StatusCode)
	}
	if r, b := req(t, c, "POST", ts.URL+"/api/me/reauth", `{"password":"Long-enough-1"}`, h); r.StatusCode != 200 {
		t.Fatalf("reauth: %d %v", r.StatusCode, b)
	}
	if r, b := req(t, c, "POST", ts.URL+"/api/admin/users", `{"username":"vera","password":"Vera-Password-123","role":"user"}`, h); r.StatusCode != 200 {
		t.Fatalf("after reauth: %d %v", r.StatusCode, b)
	}
}
