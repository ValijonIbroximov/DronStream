package web

import (
	"context"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"testing"

	"dronstream/internal/core"
)

func getRaw(t *testing.T, c *http.Client, url string) (*http.Response, string) {
	t.Helper()
	resp, err := c.Get(url)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp, string(b)
}

// The built-in guide is for administrators only, on the server side: an
// anonymous visitor, a guest and an ordinary user must all be refused for the
// page and for every asset, not merely not shown the button.
func TestAdminHelpAuthorization(t *testing.T) {
	ts, svc := setup(t)
	paths := []string{"/api/admin/help/", "/api/admin/help/index.html", "/api/admin/help/guide.css", "/api/admin/help/guide.js"}

	anon := &http.Client{Transport: ts.Client().Transport}
	for _, p := range paths {
		if r, body := getRaw(t, anon, ts.URL+p); r.StatusCode != 401 || strings.Contains(body, "DronStream qo") {
			t.Errorf("anonymous %s: %d", p, r.StatusCode)
		}
	}

	admin := &http.Client{Transport: ts.Client().Transport, Jar: newJar()}
	resp, body := req(t, admin, "POST", ts.URL+"/api/setup", `{"setupToken":"SETUP","username":"boss","password":"Long-enough-1"}`, map[string]string{"X-DS-Request": "1"})
	if resp.StatusCode != 200 {
		t.Fatalf("setup: %d %v", resp.StatusCode, body)
	}

	if _, err := svc.CreateUser(context.Background(), core.Actor{Type: "admin", ID: 1, Name: "boss"}, "vera", "Vera", "Vera-Password-123", "user", false); err != nil {
		t.Fatal(err)
	}
	user := &http.Client{Transport: ts.Client().Transport, Jar: newJar()}
	if r, b := req(t, user, "POST", ts.URL+"/api/login", `{"username":"vera","password":"Vera-Password-123"}`, map[string]string{"X-DS-Request": "1"}); r.StatusCode != 200 {
		t.Fatalf("user login: %d %v", r.StatusCode, b)
	}
	guest := &http.Client{Transport: ts.Client().Transport, Jar: newJar()}
	req(t, guest, "POST", ts.URL+"/api/guest", `{"name":"Ali","reason":"test sabab"}`, map[string]string{"X-DS-Request": "1"})
	for name, c := range map[string]*http.Client{"user": user, "guest": guest} {
		for _, p := range paths {
			if r, body := getRaw(t, c, ts.URL+p); r.StatusCode != 403 || strings.Contains(body, "DronStream qo") {
				t.Errorf("%s %s: %d (must be 403)", name, p, r.StatusCode)
			}
		}
	}

	// the administrator gets the page and its two assets, with a locked-down policy
	r, page := getRaw(t, admin, ts.URL+"/api/admin/help/")
	if r.StatusCode != 200 || !strings.Contains(page, `data-variant="admin"`) || !strings.Contains(page, `id="x-limit"`) {
		t.Fatalf("admin help page: %d", r.StatusCode)
	}
	csp := r.Header.Get("Content-Security-Policy")
	for _, want := range []string{"default-src 'none'", "script-src 'self'", "style-src 'self'", "frame-ancestors 'self'"} {
		if !strings.Contains(csp, want) {
			t.Errorf("help CSP lacks %q: %s", want, csp)
		}
	}
	if strings.Contains(csp, "unsafe-inline") || strings.Contains(csp, "connect-src") {
		t.Errorf("help CSP too permissive: %s", csp)
	}
	if r.Header.Get("X-Frame-Options") != "SAMEORIGIN" || r.Header.Get("Cache-Control") != "no-store" || r.Header.Get("Referrer-Policy") != "no-referrer" {
		t.Errorf("help headers: %v", r.Header)
	}
	if r, _ := getRaw(t, admin, ts.URL+"/api/admin/help/guide.js"); r.StatusCode != 200 || !strings.HasPrefix(r.Header.Get("Content-Type"), "text/javascript") {
		t.Errorf("guide.js: %d %s", r.StatusCode, r.Header.Get("Content-Type"))
	}
	if r, _ := getRaw(t, admin, ts.URL+"/api/admin/help/guide.css"); r.StatusCode != 200 || !strings.HasPrefix(r.Header.Get("Content-Type"), "text/css") {
		t.Errorf("guide.css: %d", r.StatusCode)
	}
	// nothing else can be read through this endpoint
	for _, p := range []string{"/api/admin/help/../../../config/dronstream.yaml", "/api/admin/help/%2e%2e/webui.go", "/api/admin/help/master.key", "/api/admin/help/sub/index.html"} {
		if r, _ := getRaw(t, admin, ts.URL+p); r.StatusCode == 200 {
			t.Errorf("help endpoint served %s", p)
		}
	}
	// every other page keeps refusing to be framed
	if r, _ := getRaw(t, admin, ts.URL+"/api/session"); r.Header.Get("X-Frame-Options") != "DENY" {
		t.Errorf("ordinary responses must stay unframeable: %q", r.Header.Get("X-Frame-Options"))
	}
}

func repoFile(t *testing.T, rel string) string {
	t.Helper()
	_, f, _, _ := runtime.Caller(0)
	b, err := os.ReadFile(filepath.Join(filepath.Dir(f), "..", "..", "..", filepath.FromSlash(rel)))
	if err != nil {
		t.Fatalf("%s: %v (generate it with: node guide/build.mjs)", rel, err)
	}
	return strings.ReplaceAll(string(b), "\r\n", "\n")
}

// info.html must work from file:// without any network, and neither variant
// may carry real addresses, secrets or active content beyond its own script.
func TestGuideIsSelfContainedAndSafe(t *testing.T) {
	info := repoFile(t, "info.html")
	help := repoFile(t, "backend/internal/webui/help/index.html")
	js := repoFile(t, "backend/internal/webui/help/guide.js")
	css := repoFile(t, "backend/internal/webui/help/guide.css")

	// standalone: one file, everything inline, network forbidden by its own policy
	if !strings.Contains(info, `http-equiv="Content-Security-Policy" content="default-src 'none'`) {
		t.Error("info.html must forbid all network access itself")
	}
	if !strings.Contains(info, "<style>") || !strings.Contains(info, "<script>") || !strings.Contains(info, `data-variant="standalone"`) {
		t.Error("info.html must inline its style and script")
	}
	external := regexp.MustCompile(`(?i)(src|href|action|poster|data)\s*=\s*["']?\s*(https?:)?//|@import|url\(\s*["']?(https?:)?//`)
	for name, text := range map[string]string{"info.html": info, "help/index.html": help, "guide.css": css} {
		if m := external.FindString(text); m != "" {
			t.Errorf("%s references an external resource: %q", name, m)
		}
	}
	for _, call := range []string{"fetch(", "XMLHttpRequest", "WebSocket(", "EventSource(", "sendBeacon(", "importScripts(", "eval(", "new Function(", ".innerHTML", "document.write", "document.cookie"} {
		if strings.Contains(js, call) {
			t.Errorf("guide.js uses %q (no network, no dynamic code, no HTML injection)", call)
		}
	}
	// admin variant: no inline script/style/handlers, so the strict policy does not break it
	if regexp.MustCompile(`(?i)<style[\s>]|\sstyle\s*=|\son[a-z]+\s*=`).MatchString(help) || regexp.MustCompile(`(?i)<script(?:\s[^>]*)?>[^<]`).MatchString(help) {
		t.Error("help/index.html has inline style, script or event handlers")
	}
	if !strings.Contains(help, `<link rel="stylesheet" href="guide.css">`) || !strings.Contains(help, `<script src="guide.js"></script>`) {
		t.Error("help/index.html must load its own guide.css and guide.js")
	}
	// both variants come from the same source: identical body content
	body := func(s string) string {
		i, j := strings.Index(s, `<main id="content">`), strings.Index(s, "</main>")
		if i < 0 || j < 0 {
			t.Fatal("main block not found")
		}
		return s[i:j]
	}
	if body(info) != body(help) {
		t.Error("info.html and the admin help differ in content: regenerate with node guide/build.mjs")
	}
	// no operational data: private/test addresses, tokens, keys, e-mail addresses
	leaks := map[string]*regexp.Regexp{
		"IPv4 address":   regexp.MustCompile(`\b(?:\d{1,3}\.){3}\d{1,3}\b`),
		"e-mail address": regexp.MustCompile(`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}`),
		"private key":    regexp.MustCompile(`-----BEGIN`),
		"GitHub token":   regexp.MustCompile(`gh[pousr]_[A-Za-z0-9]{20,}`),
		"long hex/base64 secret": regexp.MustCompile(`\b[A-Za-z0-9_-]{40,}\b`),
	}
	allowedIP := map[string]bool{"127.0.0.1": true, "10.8.0.0": true}
	text := body(info)
	for name, re := range leaks {
		for _, m := range re.FindAllString(text, -1) {
			if name == "IPv4 address" && allowedIP[m] {
				continue
			}
			t.Errorf("guide contains a %s: %q", name, m)
		}
	}
	// code samples keep placeholders escaped (they are text, never markup)
	if strings.Contains(text, "<SERVER_IP>") || !strings.Contains(text, "&lt;SERVER_IP&gt;") {
		t.Error("placeholders must be HTML-escaped")
	}
	// separate cards: a setup command block never also contains its own removal
	cards := regexp.MustCompile(`(?s)<div class="cmd (k-[a-z]+)".*?</pre>`).FindAllStringSubmatch(text, -1)
	if len(cards) < 25 {
		t.Fatalf("expected the command cards, found %d", len(cards))
	}
	for _, c := range cards {
		code := c[0][strings.Index(c[0], "<pre"):]
		if c[1] != "k-undo" && regexp.MustCompile(`(?i)-Remove\b|ufw delete [0-9a]|uninstall-service|Remove-NetFirewallRule|rm -rf`).MatchString(code) {
			t.Errorf("a %s card contains a removal command: %.120s", c[1], code)
		}
		if c[1] == "k-diag" && regexp.MustCompile(`(?i)\b(-Apply|ufw allow|systemctl (enable|start|stop|restart)|install\.(sh|ps1)|Set-|New-NetFirewall|chmod|chown)\b`).MatchString(code) {
			t.Errorf("a diagnostic card changes the system: %.120s", code)
		}
	}
	for _, bad := range []string{"chmod 777 ", "ufw disable", "Set-NetFirewallProfile", "DisableRealtimeMonitoring", "--no-verify", "push --force", "push -f "} {
		if strings.Contains(strings.Join(regexp.MustCompile(`(?s)<pre.*?</pre>`).FindAllString(text, -1), " "), bad) {
			t.Errorf("guide recommends %q", bad)
		}
	}
}
