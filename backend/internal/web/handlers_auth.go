package web

import (
	"net/http"

	"dronstream/internal/core"
)

type sessionOut struct {
	Authenticated bool          `json:"authenticated"`
	SetupNeeded   bool          `json:"setupNeeded"`
	CSRF          string        `json:"csrf,omitempty"`
	Session       *core.Session `json:"session,omitempty"`
	GuestEnabled  bool          `json:"guestEnabled"`
	Guest         any           `json:"guest,omitempty"`
	// Secure mode: this administrator must enable TOTP before anything else.
	MFASetupRequired bool `json:"mfaSetupRequired,omitempty"`
	// Administrators only: "secure" or "standard" (laboratory), and who can reach
	// the unencrypted RTMP listener (off | loopback | private | open).
	SecurityMode string `json:"securityMode,omitempty"`
	PlainIngest  string `json:"plainIngest,omitempty"`
}

func (s *Server) sessionPayload(r *http.Request, se *core.Session) sessionOut {
	out := sessionOut{}
	need, _ := s.Core.SetupNeeded(r.Context())
	out.SetupNeeded = need
	st, _ := s.Core.State(r.Context())
	out.GuestEnabled = st.GuestEnabled && st.InstanceState == "active"
	if se != nil {
		out.Authenticated = true
		out.CSRF = se.CSRF
		out.Session = se
		out.MFASetupRequired = s.mfaSetupRequired(se)
		if se.IsAdmin() {
			out.SecurityMode = s.Cfg.Security.Mode
			out.PlainIngest = plainIngestName(s.Cfg.Media.RTMPListen)
		}
		if se.Kind == "guest" {
			gs, _ := s.Core.ListGuests(r.Context(), "")
			for _, g := range gs {
				if g.ID == se.GuestID {
					// Only the guest's own decision; no stream list here.
					out.Guest = map[string]any{"status": g.Status, "accessUntil": g.AccessUntil, "note": g.Note, "name": g.DisplayName}
					break
				}
			}
		}
	}
	return out
}

func (s *Server) getSession(w http.ResponseWriter, r *http.Request) {
	se, _ := r.Context().Value(sessKey).(*core.Session)
	writeJSON(w, 200, s.sessionPayload(r, se))
}

func (s *Server) setup(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if !s.limSetup.Allow(ip) {
		writeErr(w, &core.Error{Status: 429, Code: "rate", Msg: "Juda ko'p urinish"})
		return
	}
	var in struct{ SetupToken, Username, DisplayName, Password string }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if s.Hooks.CheckSetupToken == nil || !s.Hooks.CheckSetupToken(in.SetupToken) {
		s.Core.Audit(r.Context(), core.Actor{Type: "anonymous", IP: ip}, "admin_setup_failed", "", nil)
		writeErr(w, &core.Error{Status: 403, Code: "bad_setup_token", Msg: "Bir martalik o'rnatish kodi noto'g'ri"})
		return
	}
	if _, err := s.Core.SetupFirstAdmin(r.Context(), in.Username, in.DisplayName, in.Password, ip); err != nil {
		writeErr(w, err)
		return
	}
	if s.Hooks.ConsumeSetupToken != nil {
		s.Hooks.ConsumeSetupToken()
	}
	tok, se, err := s.Core.Login(r.Context(), in.Username, in.Password, ip, r.UserAgent())
	if err != nil {
		writeErr(w, err)
		return
	}
	s.setCookie(w, tok, se.ExpiresAt)
	writeJSON(w, 200, s.sessionPayload(r, se))
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if !s.limLogin.Allow(ip) {
		writeErr(w, &core.Error{Status: 429, Code: "rate", Msg: "Juda ko'p urinish. Bir daqiqadan so'ng qayta urining"})
		return
	}
	var in struct{ Username, Password, Otp string }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if old := s.sessionFrom(r); old != nil {
		s.Core.Logout(r.Context(), old, ip) // no session fixation / mixing
	}
	tok, se, err := s.Core.LoginOTP(r.Context(), in.Username, in.Password, in.Otp, ip, r.UserAgent())
	if err != nil {
		writeErr(w, err)
		return
	}
	s.setCookie(w, tok, se.ExpiresAt)
	writeJSON(w, 200, s.sessionPayload(r, se))
}

func (s *Server) guestRequest(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if !s.limGuest.Allow(ip) {
		writeErr(w, &core.Error{Status: 429, Code: "rate", Msg: "Juda ko'p so'rov. Birozdan so'ng urinib ko'ring"})
		return
	}
	var in struct{ Name, Reason string }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if old := s.sessionFrom(r); old != nil {
		s.Core.Logout(r.Context(), old, ip)
	}
	tok, se, err := s.Core.CreateGuestRequest(r.Context(), in.Name, in.Reason, ip, r.UserAgent())
	if err != nil {
		writeErr(w, err)
		return
	}
	s.setCookie(w, tok, se.ExpiresAt)
	writeJSON(w, 200, s.sessionPayload(r, se))
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	s.Core.Logout(r.Context(), sess(r), clientIP(r))
	s.Hub.CloseSession(sess(r).ID)
	s.clearCookie(w)
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (s *Server) changePassword(w http.ResponseWriter, r *http.Request) {
	var in struct{ Old, New string }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if err := s.Core.ChangeOwnPassword(r.Context(), sess(r), in.Old, in.New, clientIP(r)); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]bool{"ok": true})
}

func (s *Server) events(w http.ResponseWriter, r *http.Request) {
	se := sess(r)
	s.Hub.serve(w, r, se, func() { s.Core.Touch(r.Context(), se.ID) })
}
