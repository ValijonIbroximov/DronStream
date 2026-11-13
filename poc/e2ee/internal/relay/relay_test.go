package relay

import (
	"encoding/base64"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const viewerOrigin = "http://127.0.0.1:59321"

func do(t *testing.T, h http.Handler, method, path, origin, body string) *http.Response {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if origin != "" {
		req.Header.Set("Origin", origin)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec.Result()
}

func TestCORSOnlyForTheViewerOrigin(t *testing.T) {
	r := New(Options{AllowedOrigins: []string{viewerOrigin}})

	resp := do(t, r, http.MethodGet, "/v1/streams/s/joins", viewerOrigin, "")
	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != viewerOrigin || resp.StatusCode != http.StatusOK {
		t.Fatalf("allowed origin: status %d, ACAO %q", resp.StatusCode, got)
	}
	resp = do(t, r, http.MethodOptions, "/v1/streams/s/joins", viewerOrigin, "")
	if resp.StatusCode != http.StatusNoContent || !strings.Contains(resp.Header.Get("Access-Control-Allow-Headers"), "Content-Type") {
		t.Fatalf("preflight: status %d headers %v", resp.StatusCode, resp.Header)
	}
	for _, origin := range []string{"http://evil.example", "http://127.0.0.1:59320", "null"} {
		resp = do(t, r, http.MethodGet, "/v1/streams/s/joins", origin, "")
		if got := resp.Header.Get("Access-Control-Allow-Origin"); got != "" {
			t.Fatalf("origin %q must not be allowed, got ACAO %q", origin, got)
		}
		if resp = do(t, r, http.MethodOptions, "/v1/streams/s/joins", origin, ""); resp.StatusCode == http.StatusNoContent {
			t.Fatalf("preflight from %q must not succeed", origin)
		}
	}
}

// The relay must not be the origin that delivers the viewer page or script.
func TestRelayServesNoPages(t *testing.T) {
	r := New(Options{})
	for _, path := range []string{"/", "/viewer.html", "/viewer.bundle.js", "/index.html"} {
		if resp := do(t, r, http.MethodGet, path, "", ""); resp.StatusCode != http.StatusNotFound {
			t.Errorf("GET %s: status %d, want 404", path, resp.StatusCode)
		}
	}
}

func TestInputLimitsAndAttackHooksOffByDefault(t *testing.T) {
	r := New(Options{})
	pub := base64.StdEncoding.EncodeToString(make([]byte, 65))
	cases := []struct {
		method, path, body string
		want               int
	}{
		{http.MethodPost, "/v1/streams/s/joins", `{"pub":"` + pub + `","label":"ok"}`, http.StatusNoContent},
		{http.MethodPost, "/v1/streams/s/joins", `{"pub":"` + pub + `","label":"ok"}`, http.StatusNoContent}, // duplicate is fine
		{http.MethodPost, "/v1/streams/s/joins", `{"pub":"AAAA"}`, http.StatusBadRequest},
		{http.MethodPost, "/v1/streams/s/joins", `not json`, http.StatusBadRequest},
		{http.MethodPost, "/v1/streams/s/joins", `{"pub":"` + pub + `","label":"` + strings.Repeat("x", 65) + `"}`, http.StatusBadRequest},
		{http.MethodPost, "/v1/streams/s/joins", `{"pub":"` + pub + `","label":"` + strings.Repeat("x", 5000) + `"}`, http.StatusBadRequest},
		{http.MethodGet, "/v1/streams/bad%20id/joins", "", http.StatusBadRequest},
		{http.MethodPost, "/v1/streams/s/envelopes/not-a-fingerprint", `{}`, http.StatusBadRequest},
		{http.MethodPost, "/v1/streams/s/envelopes/" + strings.Repeat("a", 64), `{"x":1}`, http.StatusNoContent},
		{http.MethodPost, "/v1/streams/s/frames", "\xff\xff\xff\xff", http.StatusBadRequest}, // 4 GiB frame announced
		{http.MethodPost, "/attack/tamper", "", http.StatusNotFound},
	}
	for _, c := range cases {
		if resp := do(t, r, c.method, c.path, "", c.body); resp.StatusCode != c.want {
			t.Errorf("%s %s: status %d, want %d", c.method, c.path, resp.StatusCode, c.want)
		}
	}
	resp := do(t, r, http.MethodGet, "/v1/streams/s/joins", "", "")
	body, _ := io.ReadAll(resp.Body)
	if strings.Count(string(body), pub) != 1 {
		t.Errorf("join list should contain the key once: %s", body)
	}
	if r.AttackTamper(1) == nil || r.AttackReplay(1) == nil || r.AttackSubstituteJoinKey(nil) == nil {
		t.Error("attack hooks must be refused unless explicitly enabled")
	}
}
