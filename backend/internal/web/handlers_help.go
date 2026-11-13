package web

import (
	"io/fs"
	"net/http"

	"dronstream/internal/webui"
)

// helpFiles is the complete set of files the help endpoint can return.
var helpFiles = map[string]string{
	"":           "text/html; charset=utf-8",
	"index.html": "text/html; charset=utf-8",
	"guide.css":  "text/css; charset=utf-8",
	"guide.js":   "text/javascript; charset=utf-8",
}

// adminHelp serves the built-in guide. It sits behind the admin middleware:
// the operational guide is for administrators, and nobody else can fetch it.
// The page gets its own, stricter policy: it may load only its own script
// and style, cannot connect anywhere, and may be framed only by this origin
// (the admin panel shows it in an overlay so that playing videos keep running).
func (s *Server) adminHelp(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("file")
	ctype, ok := helpFiles[name]
	if !ok {
		http.NotFound(w, r)
		return
	}
	if name == "" {
		name = "index.html"
	}
	fsys := webui.HelpFS()
	if fsys == nil {
		http.NotFound(w, r)
		return
	}
	b, err := fs.ReadFile(fsys, name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	hd := w.Header()
	hd.Set("Content-Type", ctype)
	hd.Set("Cache-Control", "no-store")
	hd.Set("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'self'")
	hd.Set("X-Frame-Options", "SAMEORIGIN")
	w.Write(b)
}
