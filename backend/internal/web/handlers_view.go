package web

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"dronstream/internal/core"
	"dronstream/internal/secure"
)

type viewerStream struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	IsDemo      bool   `json:"isDemo"`
	Online      bool   `json:"online"`
	Until       int64  `json:"until"`
}

// viewerStreams returns only the streams this session may watch. Unapproved
// guests get an empty list; internal paths and keys are never included.
func (s *Server) viewerStreams(w http.ResponseWriter, r *http.Request) {
	list, until, err := s.Core.ViewableStreams(r.Context(), sess(r))
	if err != nil {
		writeErr(w, err)
		return
	}
	out := []viewerStream{}
	for _, st := range list {
		p, _ := s.Core.MediaPath(st)
		out = append(out, viewerStream{ID: st.ID, Name: st.Name, Description: st.Description, IsDemo: st.IsDemo, Online: s.Media.Stats(p).Online, Until: until[st.ID]})
	}
	writeJSON(w, 200, out)
}

type iceServer struct {
	URLs       []string `json:"urls"`
	Username   string   `json:"username,omitempty"`
	Credential string   `json:"credential,omitempty"`
}

func (s *Server) iceServers(sessionID int64) []iceServer {
	var out []iceServer
	if len(s.Cfg.TURN.STUNURLs) > 0 {
		out = append(out, iceServer{URLs: s.Cfg.TURN.STUNURLs})
	}
	if (s.Cfg.TURN.Mode == "builtin" || s.Cfg.TURN.Mode == "external") && len(s.Cfg.TURN.URLs) > 0 && s.Hooks.TURNSecret != "" {
		u, p, _ := secure.TURNCredentials(s.Hooks.TURNSecret, "s"+strconv.FormatInt(sessionID, 10), time.Duration(s.Cfg.TURN.CredMinutes)*time.Minute)
		out = append(out, iceServer{URLs: s.Cfg.TURN.URLs, Username: u, Credential: p})
	}
	return out
}

func (s *Server) ticket(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	se := sess(r)
	if !s.limTicket.Allow(strconv.FormatInt(se.ID, 10)) {
		writeErr(w, &core.Error{Status: 429, Code: "rate", Msg: "Juda ko'p so'rov"})
		return
	}
	if !s.Media.Healthy() {
		writeErr(w, &core.Error{Status: 503, Code: "auth_unavailable", Msg: core.ReasonText("auth_unavailable")})
		return
	}
	var in struct{ Tab string }
	readJSON(r, &in)
	// A source that is not publishing cannot be watched: answer right away
	// instead of issuing a ticket that MediaMTX would only turn into a 404.
	// (Authorisation first, so the online state is not leaked.)
	if d, err := s.Core.ViewStatus(r.Context(), se, id); err == nil && d.OK && s.Media.MediaUp() {
		if st, err := s.Core.GetStream(r.Context(), id); err == nil {
			if p, err := s.Core.MediaPath(st); err == nil && !s.Media.Stats(p).Online {
				writeErr(w, &core.Error{Status: 403, Code: "stream_offline", Msg: "Manba hozir efirda emas (pult ulanmagan)"})
				return
			}
		}
	}
	t, err := s.Core.IssueTicket(r.Context(), se, id, in.Tab, clientIP(r))
	if tooManyInSlot(err) {
		// The same player asks again while its older connections are still
		// registered (page reload, lost network): the newest request wins.
		if s.Media.SupersedeSlot(r.Context(), se, id, in.Tab) > 0 {
			t, err = s.Core.IssueTicket(r.Context(), se, id, in.Tab, clientIP(r))
		}
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	label := se.Name
	if se.Kind == "guest" {
		label = "Mehmon (tasdiqlanmagan ism): " + se.Name
	}
	writeJSON(w, 200, map[string]any{
		"ticket": t.Token, "ticketExpiresAt": t.ExpiresAt, "leaseUntil": t.LeaseUntil, "serverNow": time.Now().UnixMilli(),
		"iceServers": s.iceServers(se.ID), "watermark": label,
	})
}

func (s *Server) watchStatus(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	d, err := s.Core.ViewStatus(r.Context(), sess(r), id)
	if err != nil {
		writeErr(w, err)
		return
	}
	out := map[string]any{"ok": d.OK, "code": d.Reason, "message": core.ReasonText(d.Reason), "until": d.Until}
	if d.OK {
		st, err := s.Core.GetStream(r.Context(), id)
		if err == nil {
			p, _ := s.Core.MediaPath(st)
			out["online"] = s.Media.Stats(p).Online
		}
		out["message"] = ""
	}
	writeJSON(w, 200, out)
}

// whepOffer proxies a WHEP offer to MediaMTX on loopback. The browser never
// learns the internal path; the ticket must belong to this browser session.
func (s *Server) whepOffer(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	se := sess(r)
	tok := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if tok == "" {
		writeErr(w, core.ErrUnauthorized)
		return
	}
	mpath, nonce, err := s.Core.TicketForProxy(r.Context(), se, id, tok)
	if err != nil {
		writeErr(w, err)
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 128<<10))
	if err != nil || !bytes.HasPrefix(body, []byte("v=0")) {
		writeErr(w, core.ErrBadRequest)
		return
	}
	target := s.Media.WebRTCBase + "/" + mpath + "/whep?ds=" + url.QueryEscape(nonce)
	req, _ := http.NewRequestWithContext(r.Context(), http.MethodPost, target, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/sdp")
	req.Header.Set("Authorization", "Bearer "+tok)
	req.Header.Set("User-Agent", r.UserAgent())
	resp, err := s.whep.Do(req)
	if err != nil {
		s.Core.DropPendingMedia(context.WithoutCancel(r.Context()), nonce, "connect_failed")
		s.Log.Error("whep proxy", "err", err)
		writeErr(w, &core.Error{Status: 502, Code: "media_unavailable", Msg: "Media server javob bermadi"})
		return
	}
	defer resp.Body.Close()
	answer, _ := io.ReadAll(io.LimitReader(resp.Body, 256<<10))
	if resp.StatusCode != http.StatusCreated {
		// The hook may already have recorded this attempt; it never started.
		s.Core.DropPendingMedia(context.WithoutCancel(r.Context()), nonce, "connect_failed")
		// Explain why (the hook decided; recompute the reason for the user).
		d, _ := s.Core.ViewStatus(r.Context(), se, id)
		code := d.Reason
		if d.OK {
			code = "media_unavailable"
			if resp.StatusCode == http.StatusNotFound {
				code = "stream_offline"
			} else if resp.StatusCode == http.StatusUnauthorized {
				code = "connect_denied"
			}
		}
		msg := core.ReasonText(code)
		switch code {
		case "stream_offline":
			msg = "Manba hozir efirda emas (pult ulanmagan)"
		case "connect_denied":
			msg = "Ulanish rad etildi (chipta ishlatilgan, muddati o'tgan yoki ulanishlar soni chegarada)"
		}
		writeJSON(w, http.StatusForbidden, map[string]string{"code": code, "message": msg})
		return
	}
	loc := resp.Header.Get("Location")
	res := ""
	if u, err := url.Parse(loc); err == nil {
		res = path_base(u.Path)
	}
	s.Core.SetWhepResource(r.Context(), nonce, res)
	w.Header().Set("Content-Type", "application/sdp")
	w.Header().Set("Location", "/api/whep/"+strconv.FormatInt(id, 10)+"/"+url.PathEscape(res))
	w.WriteHeader(http.StatusCreated)
	w.Write(answer)
}

func path_base(p string) string {
	if i := strings.LastIndex(p, "/"); i >= 0 {
		return p[i+1:]
	}
	return p
}

func (s *Server) whepDelete(w http.ResponseWriter, r *http.Request) {
	ms, err := s.Core.MediaByResource(r.Context(), sess(r), r.PathValue("res"))
	if err != nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	st, err := s.Core.GetStream(r.Context(), ms.StreamID)
	if err == nil {
		mpath, _ := s.Core.MediaPath(st)
		req, _ := http.NewRequestWithContext(r.Context(), http.MethodDelete, s.Media.WebRTCBase+"/"+mpath+"/whep/"+url.PathEscape(ms.WhepResource), nil)
		if resp, err := s.whep.Do(req); err == nil {
			resp.Body.Close()
		}
	}
	// Also kick by ID in case the resource delete raced with renegotiation.
	s.Media.API.KickWebRTC(r.Context(), ms.MtxID)
	s.Core.EndMedia(r.Context(), ms, "client_closed")
	w.WriteHeader(http.StatusNoContent)
}

func tooManyInSlot(err error) bool {
	var ce *core.Error
	return errors.As(err, &ce) && ce.Code == "too_many_sessions" && ce.Data["scope"] == "slot"
}
