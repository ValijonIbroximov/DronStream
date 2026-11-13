package web

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"dronstream/internal/config"
	"dronstream/internal/core"
	"dronstream/internal/media"
	"dronstream/internal/mtx"
	"dronstream/internal/store"
)

type fakeAPI struct{}

func (fakeAPI) WebRTCSessions(context.Context) ([]mtx.WebRTCSession, error)  { return nil, nil }
func (fakeAPI) KickWebRTC(context.Context, string) error                     { return nil }
func (fakeAPI) Paths(context.Context) ([]mtx.Path, error)                    { return nil, nil }
func (fakeAPI) GetPath(context.Context, string) (*mtx.Path, error)          { return nil, mtx.ErrNotFound }
func (fakeAPI) RTMPConns(context.Context, bool) ([]mtx.RTMPConn, error)      { return nil, nil }
func (fakeAPI) KickRTMP(context.Context, string, bool) error                 { return nil }
func (fakeAPI) KickWebRTCPublisher(context.Context, string) error            { return nil }

func setup(t *testing.T) (*httptest.Server, *core.Service) {
	st, err := store.Open(filepath.Join(t.TempDir(), "w.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	cfg := config.Default()
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

func req(t *testing.T, c *http.Client, method, url, body string, h map[string]string) (*http.Response, map[string]any) {
	r, _ := http.NewRequest(method, url, strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	for k, v := range h {
		r.Header.Set(k, v)
	}
	resp, err := c.Do(r)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var m map[string]any
	json.NewDecoder(resp.Body).Decode(&m)
	return resp, m
}

func TestWebSecurity(t *testing.T) {
	ts, _ := setup(t)
	c := ts.Client()
	jar := newJar()
	c.Jar = jar

	// security headers
	resp, _ := req(t, c, "GET", ts.URL+"/api/session", "", nil)
	for _, h := range []string{"Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"} {
		if resp.Header.Get(h) == "" {
			t.Errorf("missing header %s", h)
		}
	}
	if !strings.Contains(resp.Header.Get("Content-Security-Policy"), "script-src 'self'") {
		t.Error("CSP")
	}
	// setup without custom header (cross-site form) is rejected
	resp, _ = req(t, c, "POST", ts.URL+"/api/setup", `{"setupToken":"SETUP","username":"boss","password":"Long-enough-1"}`, nil)
	if resp.StatusCode != 403 {
		t.Fatalf("setup without X-DS-Request: %d", resp.StatusCode)
	}
	// cross-origin
	resp, _ = req(t, c, "POST", ts.URL+"/api/setup", `{"setupToken":"SETUP","username":"boss","password":"Long-enough-1"}`, map[string]string{"X-DS-Request": "1", "Origin": "https://evil.example"})
	if resp.StatusCode != 403 {
		t.Fatalf("cross-origin setup: %d", resp.StatusCode)
	}
	resp, body := req(t, c, "POST", ts.URL+"/api/setup", `{"setupToken":"SETUP","username":"boss","password":"Long-enough-1"}`, map[string]string{"X-DS-Request": "1"})
	if resp.StatusCode != 200 {
		t.Fatalf("setup: %d %v", resp.StatusCode, body)
	}
	ck := resp.Header.Get("Set-Cookie")
	for _, want := range []string{"__Host-ds=", "Secure", "HttpOnly", "SameSite=Strict", "Path=/"} {
		if !strings.Contains(ck, want) {
			t.Errorf("cookie missing %s: %s", want, ck)
		}
	}
	csrf, _ := body["csrf"].(string)
	// state change without CSRF token
	resp, _ = req(t, c, "POST", ts.URL+"/api/admin/emergency", `{"on":true}`, map[string]string{"X-DS-Request": "1"})
	if resp.StatusCode != 403 {
		t.Fatalf("no CSRF: %d", resp.StatusCode)
	}
	resp, _ = req(t, c, "POST", ts.URL+"/api/admin/emergency", `{"on":true}`, map[string]string{"X-DS-Request": "1", "X-CSRF-Token": "wrong"})
	if resp.StatusCode != 403 {
		t.Fatalf("bad CSRF: %d", resp.StatusCode)
	}
	resp, _ = req(t, c, "POST", ts.URL+"/api/admin/emergency", `{"on":false}`, map[string]string{"X-DS-Request": "1", "X-CSRF-Token": csrf})
	if resp.StatusCode != 200 {
		t.Fatalf("valid CSRF: %d", resp.StatusCode)
	}
	// anonymous cannot reach admin or viewer APIs
	anon := &http.Client{Transport: ts.Client().Transport}
	for _, p := range []string{"/api/admin/users", "/api/streams", "/api/admin/streams/1/key"} {
		if r, _ := req(t, anon, "GET", ts.URL+p, "", nil); r.StatusCode != 401 {
			t.Errorf("anon %s: %d", p, r.StatusCode)
		}
	}
	// guest cannot use admin API
	g := &http.Client{Transport: ts.Client().Transport}
	g.Jar = newJar()
	_, gb := req(t, g, "POST", ts.URL+"/api/guest", `{"name":"Ali","reason":"test sabab"}`, map[string]string{"X-DS-Request": "1"})
	if r, _ := req(t, g, "GET", ts.URL+"/api/admin/guests", "", nil); r.StatusCode != 403 {
		t.Errorf("guest admin access: %d", r.StatusCode)
	}
	if r, _ := req(t, g, "POST", ts.URL+"/api/admin/guests/1/approve", `{"streamIds":[1]}`, map[string]string{"X-DS-Request": "1", "X-CSRF-Token": gb["csrf"].(string)}); r.StatusCode != 403 {
		t.Errorf("guest self-approve: %d", r.StatusCode)
	}
}

func TestLoginRateLimit(t *testing.T) {
	ts, _ := setup(t)
	c := ts.Client()
	limited := false
	for i := 0; i < 15; i++ {
		r, _ := req(t, c, "POST", ts.URL+"/api/login", `{"username":"x","password":"y"}`, map[string]string{"X-DS-Request": "1"})
		if r.StatusCode == 429 {
			limited = true
			break
		}
	}
	if !limited {
		t.Fatal("login not rate limited")
	}
}

func newJar() http.CookieJar {
	j, _ := cookiejar.New(nil)
	return j
}
