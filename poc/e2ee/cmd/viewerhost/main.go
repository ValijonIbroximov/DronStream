// Command viewerhost serves the static viewer page on 127.0.0.1.
//
//	viewerhost [-port 59321] [-dir viewer] [-relay-origins http://127.0.0.1:59320,http://localhost:59320]
//
// It is deliberately a separate process and a separate web origin from the
// relay: the end-to-end property only holds if the JavaScript that handles
// keys does NOT come from the party that relays the video. Whoever delivers
// the page can read every key the page handles.
package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"dronstream-poc-e2ee/internal/local"
)

// files is the complete list of what this server hands out.
var files = map[string]struct{ path, contentType string }{
	"/viewer.html":             {"viewer.html", "text/html; charset=utf-8"},
	"/viewer.css":              {"viewer.css", "text/css; charset=utf-8"},
	"/viewer.bundle.js":        {"viewer.bundle.js", "text/javascript; charset=utf-8"},
	"/THIRD-PARTY-NOTICES.txt": {"THIRD-PARTY-NOTICES.txt", "text/plain; charset=utf-8"},
}

func main() {
	port := flag.Int("port", 59321, "loopback port to listen on")
	dir := flag.String("dir", "viewer", "directory with viewer.html, viewer.css and viewer.bundle.js")
	origins := flag.String("relay-origins", "http://127.0.0.1:59320,http://localhost:59320",
		"comma separated origins the page may connect to (Content-Security-Policy connect-src)")
	flag.Parse()
	for _, o := range strings.Split(*origins, ",") {
		if u, err := url.Parse(o); err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || o != u.Scheme+"://"+u.Host {
			log.Fatalf("viewerhost: -relay-origins: %q is not an origin like http://127.0.0.1:59320", o)
		}
	}
	relayOrigins := strings.ReplaceAll(*origins, ",", " ")

	for _, f := range files {
		if _, err := os.Stat(filepath.Join(*dir, f.path)); err != nil {
			log.Fatalf("viewerhost: %v (build the bundle with: npm run build)", err)
		}
	}
	// The page may load scripts and styles only from this origin and may
	// talk only to the relay origins: no CDN, no other network destination.
	csp := "default-src 'none'; script-src 'self'; style-src 'self'; connect-src " + relayOrigins +
		"; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if r.URL.Path == "/" {
			http.Redirect(w, r, "/viewer.html", http.StatusFound)
			return
		}
		f, ok := files[r.URL.Path]
		if !ok {
			http.NotFound(w, r)
			return
		}
		data, err := os.ReadFile(filepath.Join(*dir, f.path))
		if err != nil {
			http.Error(w, "file missing", http.StatusInternalServerError)
			return
		}
		h := w.Header()
		h.Set("Content-Type", f.contentType)
		h.Set("Content-Security-Policy", csp)
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Cache-Control", "no-store")
		w.Write(data)
	})

	l, err := local.Listen(*port)
	if err != nil {
		log.Fatalf("viewerhost: %v", err)
	}
	fmt.Printf("LISTEN %s\n", local.URL(l))
	log.Printf("viewer page: %s/viewer.html (may connect only to: %s)", local.URL(l), relayOrigins)
	srv := &http.Server{Handler: handler, ReadHeaderTimeout: 5 * time.Second}
	log.Fatal(srv.Serve(l))
}
