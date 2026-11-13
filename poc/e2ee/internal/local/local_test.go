package local

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGuardRefusesAnythingABrowserPageCouldSend(t *testing.T) {
	h := Guard(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }))
	cases := []struct {
		name, host, origin, header string
		want                       int
	}{
		{"operator tool", "127.0.0.1:59322", "", "1", http.StatusOK},
		{"operator tool via localhost", "localhost:59322", "", "1", http.StatusOK},
		{"plain navigation or form post (no custom header)", "127.0.0.1:59322", "", "", http.StatusForbidden},
		{"cross-site fetch", "127.0.0.1:59322", "http://evil.example", "1", http.StatusForbidden},
		{"fetch from the viewer page", "127.0.0.1:59322", "http://127.0.0.1:59321", "1", http.StatusForbidden},
		{"DNS rebinding (foreign Host)", "evil.example:59322", "", "1", http.StatusForbidden},
	}
	for _, c := range cases {
		req := httptest.NewRequest(http.MethodPost, "/cmd", nil)
		req.Host = c.host
		if c.origin != "" {
			req.Header.Set("Origin", c.origin)
		}
		if c.header != "" {
			req.Header.Set(OperatorHeader, c.header)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != c.want {
			t.Errorf("%s: status %d, want %d", c.name, rec.Code, c.want)
		}
	}
}

func TestListenIsLoopbackOnly(t *testing.T) {
	l, err := Listen(0)
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	if host := l.Addr().String(); len(host) < 10 || host[:10] != "127.0.0.1:" {
		t.Fatalf("listening on %s, want 127.0.0.1", host)
	}
}
