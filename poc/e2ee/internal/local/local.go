// Package local keeps every PoC process on the loopback interface and guards
// the operator-only endpoints against requests triggered by web pages.
package local

import (
	"fmt"
	"net"
	"net/http"
)

// Listen binds 127.0.0.1 only. Port 0 picks a free port (used by tests).
func Listen(port int) (net.Listener, error) {
	if port < 0 || port > 65535 {
		return nil, fmt.Errorf("bad port %d", port)
	}
	return net.Listen("tcp4", fmt.Sprintf("127.0.0.1:%d", port))
}

// URL returns the http URL of a listener created by Listen.
func URL(l net.Listener) string { return "http://" + l.Addr().String() }

// OperatorHeader must be present on every request to a guarded endpoint.
// Browsers cannot add a custom header to a cross-origin request without a
// CORS preflight, and guarded endpoints never answer preflights.
const OperatorHeader = "X-DronStream-PoC-Operator"

// Guard wraps an operator-only handler (source control, relay attack hooks).
// It refuses anything that could come from a web page:
//   - a Host header that is not a loopback literal (DNS rebinding),
//   - any request carrying an Origin header (cross-site fetch or form post),
//   - any request without the custom operator header (plain navigation).
//
// It is not authentication: any local process can still call the endpoint,
// exactly like any local process could type into the operator's terminal.
func Guard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host, _, err := net.SplitHostPort(r.Host)
		if err != nil {
			host = r.Host
		}
		if host != "127.0.0.1" && host != "localhost" && host != "::1" {
			http.Error(w, "loopback only", http.StatusForbidden)
			return
		}
		if r.Header.Get("Origin") != "" || r.Header.Get(OperatorHeader) == "" {
			http.Error(w, "operator endpoint: not callable from a web page", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
