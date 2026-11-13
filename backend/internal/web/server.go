// Package web is the HTTPS API + static frontend + WHEP proxy.
package web

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log/slog"
	"net"
	"net/http"
	"path"
	"strconv"
	"strings"
	"time"

	"dronstream/internal/config"
	"dronstream/internal/core"
	"dronstream/internal/media"
	"dronstream/internal/mediafiles"
	"dronstream/internal/secure"
)

const cookieName = "__Host-ds"

type ctxKey int

const sessKey ctxKey = 1

// Hooks are optional integrations provided by the app (backup, setup token, ...).
type Hooks struct {
	CheckSetupToken func(tok string) bool
	ConsumeSetupToken func()
	Backup          func(ctx context.Context, pass string) (string, error)
	ListBackups     func() ([]map[string]any, error)
	BackupPath      func(name string) (string, error)
	SystemInfo      func() map[string]any
	TURNSecret      string
}

type Server struct {
	Core   *core.Service
	Media  *media.Manager
	Hub    *Hub
	Cfg    *config.Config
	Log    *slog.Logger
	Static fs.FS // frontend build (may be nil in tests)
	Hooks  Hooks
	// HTTP client for the loopback WHEP proxy.
	whep *http.Client

	limLogin, limGuest, limSetup, limTicket, limLink *limiter

	// Files is the uploaded media store (images/videos).
	Files *mediafiles.Store
}

func New(c *core.Service, m *media.Manager, hub *Hub, cfg *config.Config, log *slog.Logger, static fs.FS, hooks Hooks) *Server {
	return &Server{Core: c, Media: m, Hub: hub, Cfg: cfg, Log: log, Static: static, Hooks: hooks,
		whep:     &http.Client{Timeout: 20 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }},
		limLogin: newLimiter(10, 5), limGuest: newLimiter(0.3, 3), limSetup: newLimiter(5, 5), limTicket: newLimiter(120, 30), limLink: newLimiter(float64(cfg.Security.LinkRatePerMinute), cfg.Security.LinkRatePerMinute/2+1),
	}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	// public
	mux.HandleFunc("GET /api/health", s.health)
	mux.HandleFunc("GET /api/session", s.optional(s.getSession))
	mux.HandleFunc("POST /api/setup", s.public(s.setup))
	mux.HandleFunc("POST /api/login", s.public(s.login))
	mux.HandleFunc("POST /api/guest", s.public(s.guestRequest))
	mux.HandleFunc("POST /api/logout", s.authed(s.logout))
	mux.HandleFunc("POST /api/me/password", s.authed(s.changePassword))
	mux.HandleFunc("GET /api/events", s.authed(s.events))
	mux.HandleFunc("POST /api/link/inspect", s.public(s.linkInspect))
	mux.HandleFunc("POST /api/link/activate", s.public(s.linkActivate))
	mux.HandleFunc("GET /api/library", s.authed(s.library))
	mux.HandleFunc("GET /api/content/{id}/file", s.authed(s.contentFile(false)))
	mux.HandleFunc("GET /api/content/{id}/thumb", s.authed(s.contentFile(true)))
	// viewer
	mux.HandleFunc("GET /api/streams", s.authed(s.viewerStreams))
	mux.HandleFunc("POST /api/watch/{id}/ticket", s.authed(s.ticket))
	mux.HandleFunc("GET /api/watch/{id}/status", s.authed(s.watchStatus))
	mux.HandleFunc("POST /api/whep/{id}", s.authed(s.whepOffer))
	mux.HandleFunc("DELETE /api/whep/{id}/{res}", s.authed(s.whepDelete))
	mux.HandleFunc("PATCH /api/whep/{id}/{res}", func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusMethodNotAllowed) })
	// admin
	a := func(p string, h http.HandlerFunc) { mux.HandleFunc(p, s.admin(h)) }
	a("GET /api/admin/overview", s.adminOverview)
	a("GET /api/admin/streams", s.adminStreams)
	a("POST /api/admin/streams", s.adminCreateStream)
	a("PUT /api/admin/streams/{id}", s.adminUpdateStream)
	a("DELETE /api/admin/streams/{id}", s.adminDeleteStream)
	a("GET /api/admin/streams/{id}/key", s.adminRevealKey)
	a("POST /api/admin/streams/{id}/rotate-key", s.adminRotateKey)
	a("POST /api/admin/streams/{id}/revoke-key", s.adminRevokeKey)
	a("POST /api/admin/streams/{id}/publish", s.adminSetPublish)
	a("POST /api/admin/streams/{id}/viewing", s.adminSetViewing)
	a("POST /api/admin/streams/{id}/kick-publisher", s.adminKickPublisher)
	a("GET /api/admin/guests", s.adminGuests)
	a("POST /api/admin/guests/{id}/approve", s.adminApproveGuest)
	a("POST /api/admin/guests/{id}/reject", s.adminRejectGuest)
	a("POST /api/admin/guests/{id}/end", s.adminEndGuest)
	a("GET /api/admin/users", s.adminUsers)
	a("POST /api/admin/users", s.adminCreateUser)
	a("PUT /api/admin/users/{id}", s.adminUpdateUser)
	a("POST /api/admin/users/{id}/block", s.adminBlockUser)
	a("POST /api/admin/users/{id}/reset-password", s.adminResetPassword)
	a("POST /api/admin/users/{id}/logout-all", s.adminLogoutAll)
	a("GET /api/admin/permissions", s.adminPermissions)
	a("POST /api/admin/permissions", s.adminGrant)
	a("POST /api/admin/permissions/revoke", s.adminRevoke)
	a("GET /api/admin/sessions", s.adminSessions)
	a("POST /api/admin/sessions/{id}/revoke", s.adminRevokeSession)
	a("GET /api/admin/media", s.adminMedia)
	a("POST /api/admin/media/{id}/kick", s.adminKickMedia)
	a("GET /api/admin/audit", s.adminAudit)
	a("POST /api/admin/emergency", s.adminEmergency)
	a("GET /api/admin/system", s.adminSystem)
	a("POST /api/admin/system/guest", s.adminGuestSettings)
	a("POST /api/admin/system/instance", s.adminInstance)
	a("POST /api/admin/backups", s.adminBackup)
	a("GET /api/admin/backups", s.adminListBackups)
	a("GET /api/admin/backups/{name}", s.adminDownloadBackup)
	a("GET /api/admin/contents", s.adminContents)
	a("POST /api/admin/contents/text", s.adminCreateText)
	a("POST /api/admin/contents/upload", s.adminUpload)
	a("POST /api/admin/contents/bulk", s.adminBulkContent)
	a("PUT /api/admin/contents/{id}", s.adminUpdateContent)
	a("DELETE /api/admin/contents/{id}", s.adminDeleteContent)
	a("GET /api/admin/collections", s.adminCollections)
	a("POST /api/admin/collections", s.adminSaveCollection)
	a("PUT /api/admin/collections/{id}", s.adminSaveCollection)
	a("DELETE /api/admin/collections/{id}", s.adminDeleteCollection)
	a("GET /api/admin/grants", s.adminGrants)
	a("POST /api/admin/grants", s.adminApplyGrants)
	a("POST /api/admin/grants/copy", s.adminCopyGrants)
	a("POST /api/admin/grants/{id}/revoke", s.adminRevokeGrant)
	a("GET /api/admin/preview", s.adminPreview)
	a("GET /api/admin/links", s.adminLinks)
	a("POST /api/admin/links", s.adminCreateLink)
	a("PUT /api/admin/links/{id}", s.adminUpdateLink)
	a("POST /api/admin/links/{id}/revoke", s.adminRevokeLink)
	a("POST /api/admin/links/{id}/regenerate", s.adminRegenerateLink)
	a("GET /api/admin/links/{id}/share", s.adminLinkShare)
	a("GET /api/admin/login-share", s.adminLoginShare)
	a("GET /api/admin/settings", s.adminGetSettings)
	a("POST /api/admin/settings/base-url", s.adminSetBaseURL)
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) { writeErr(w, core.ErrNotFound) })
	mux.HandleFunc("/", s.static)
	return s.securityHeaders(mux)
}

func (s *Server) securityHeaders(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hd := w.Header()
		hd.Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
		hd.Set("Strict-Transport-Security", "max-age=31536000")
		hd.Set("X-Content-Type-Options", "nosniff")
		hd.Set("X-Frame-Options", "DENY")
		hd.Set("Referrer-Policy", "no-referrer")
		hd.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
		hd.Set("Cross-Origin-Opener-Policy", "same-origin")
		hd.Set("Cross-Origin-Resource-Policy", "same-origin")
		if strings.HasPrefix(r.URL.Path, "/api/") {
			hd.Set("Cache-Control", "no-store")
		}
		h.ServeHTTP(w, r)
	})
}

// ---- helpers ----

func clientIP(r *http.Request) string {
	h, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return h
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, err error) {
	var ce *core.Error
	if errors.As(err, &ce) {
		out := map[string]any{"code": ce.Code, "message": ce.Msg}
		if len(ce.Data) > 0 {
			out["details"] = ce.Data
		}
		writeJSON(w, ce.Status, out)
		return
	}
	writeJSON(w, 500, map[string]string{"code": "internal", "message": "Ichki xatolik"})
}

func readJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	if err := dec.Decode(v); err != nil {
		return core.ErrBadRequest
	}
	return nil
}

func pathID(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		return 0, core.ErrBadRequest
	}
	return id, nil
}

// sameOrigin rejects cross-site state-changing requests. Browsers always send
// Origin on POST/PUT/DELETE fetches; the custom header forces a CORS preflight
// that we never approve, so plain HTML forms from other sites cannot reach us.
func (s *Server) sameOrigin(r *http.Request) bool {
	if r.Header.Get("X-DS-Request") != "1" {
		return false
	}
	o := r.Header.Get("Origin")
	if o == "" {
		return true // non-browser clients (tests/CLI); cookies are SameSite=Strict anyway
	}
	i := strings.Index(o, "://")
	if i < 0 {
		return false
	}
	return strings.EqualFold(o[i+3:], r.Host)
}

func (s *Server) sessionFrom(r *http.Request) *core.Session {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return nil
	}
	sess, err := s.Core.SessionByToken(r.Context(), c.Value)
	if err != nil {
		return nil
	}
	return sess
}

func sess(r *http.Request) *core.Session { return r.Context().Value(sessKey).(*core.Session) }

func (s *Server) optional(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if se := s.sessionFrom(r); se != nil {
			r = r.WithContext(context.WithValue(r.Context(), sessKey, se))
		}
		h(w, r)
	}
}

func (s *Server) public(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.sameOrigin(r) {
			writeErr(w, core.ErrForbidden)
			return
		}
		h(w, r)
	}
}

func (s *Server) authed(h http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		se := s.sessionFrom(r)
		if se == nil {
			writeErr(w, core.ErrUnauthorized)
			return
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			if !s.sameOrigin(r) || !secure.Equal([]byte(r.Header.Get("X-CSRF-Token")), []byte(se.CSRF)) {
				writeJSON(w, 403, map[string]string{"code": "csrf", "message": "Xavfsizlik tekshiruvi (CSRF) muvaffaqiyatsiz. Sahifani yangilang"})
				return
			}
		}
		h(w, r.WithContext(context.WithValue(r.Context(), sessKey, se)))
	}
}

func (s *Server) admin(h http.HandlerFunc) http.HandlerFunc {
	return s.authed(func(w http.ResponseWriter, r *http.Request) {
		if !sess(r).IsAdmin() {
			writeErr(w, core.ErrForbidden)
			return
		}
		h(w, r)
	})
}

func (s *Server) setCookie(w http.ResponseWriter, tok string, expires int64) {
	ss := http.SameSiteStrictMode
	if s.Cfg.Security.SameSite == "Lax" {
		ss = http.SameSiteLaxMode
	}
	http.SetCookie(w, &http.Cookie{Name: cookieName, Value: tok, Path: "/", Secure: true, HttpOnly: true, SameSite: ss,
		Expires: time.UnixMilli(expires)})
}

func (s *Server) clearCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{Name: cookieName, Value: "", Path: "/", Secure: true, HttpOnly: true, SameSite: http.SameSiteStrictMode, MaxAge: -1})
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	ok := s.Media.Healthy() && s.Media.MediaUp()
	st := 200
	if !ok {
		st = 503
	}
	writeJSON(w, st, map[string]any{"ok": ok, "auth": s.Media.Healthy(), "media": s.Media.MediaUp()})
}

// static serves the embedded React build with SPA fallback.
func (s *Server) static(w http.ResponseWriter, r *http.Request) {
	if s.Static == nil {
		http.NotFound(w, r)
		return
	}
	p := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
	if p == "" {
		p = "index.html"
	}
	f, err := s.Static.Open(p)
	if err != nil {
		p = "index.html"
		f, err = s.Static.Open(p)
		if err != nil {
			http.NotFound(w, r)
			return
		}
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil || st.IsDir() {
		http.NotFound(w, r)
		return
	}
	if strings.HasPrefix(p, "assets/") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		// index.html also serves /link (special links): never cache.
		w.Header().Set("Cache-Control", "no-store")
	}
	http.ServeContent(w, r, p, st.ModTime(), f.(io.ReadSeeker))
}
