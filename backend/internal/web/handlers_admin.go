package web

import (
	"database/sql"
	"net"
	"net/http"
	"os"
	"strconv"
	"time"

	"dronstream/internal/core"
	"dronstream/internal/media"
)

func actor(r *http.Request) core.Actor { return sess(r).Actor(clientIP(r)) }

func ok(w http.ResponseWriter) { writeJSON(w, 200, map[string]bool{"ok": true}) }

type adminStream struct {
	*core.Stream
	Stats media.StreamStats `json:"stats"`
	Viewers int             `json:"viewers"`
}

func (s *Server) streamsWithStats(r *http.Request) ([]adminStream, error) {
	list, err := s.Core.ListStreams(r.Context())
	if err != nil {
		return nil, err
	}
	live, _ := s.Core.LiveMediaSessions(r.Context())
	count := map[int64]int{}
	for _, m := range live {
		count[m.StreamID]++
	}
	out := []adminStream{}
	for _, st := range list {
		p, _ := s.Core.MediaPath(st)
		out = append(out, adminStream{Stream: st, Stats: s.Media.Stats(p), Viewers: count[st.ID]})
	}
	return out, nil
}

func (s *Server) adminOverview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	st, _ := s.Core.State(ctx)
	streams, err := s.streamsWithStats(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	pending, _ := s.Core.ListGuests(ctx, "pending")
	linkReqs, _ := s.Core.PendingLinkRequests(ctx)
	live, _ := s.Core.LiveMediaSessions(ctx)
	sessions, _ := s.Core.ListWebSessions(ctx)
	online := s.Hub.Online()
	nOnline := 0
	for _, se := range sessions {
		if online[se.ID] > 0 {
			nOnline++
		}
	}
	writeJSON(w, 200, map[string]any{
		"state": st, "streams": streams, "pendingGuests": len(pending), "pendingLinkRequests": len(linkReqs), "mediaSessions": len(live),
		"webSessions": len(sessions), "onlineSessions": nOnline,
		"health": map[string]any{"auth": s.Media.Healthy(), "media": s.Media.MediaUp(), "lastReconcile": s.Media.LastPass(), "lastEnforceMicros": s.Media.LastEnforce.Load()},
	})
}

func (s *Server) adminStreams(w http.ResponseWriter, r *http.Request) {
	out, err := s.streamsWithStats(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, out)
}

func (s *Server) pultURLs(st *core.Stream, key string) map[string]string {
	host := s.Cfg.Media.PublishHost
	out := map[string]string{}
	mk := func(scheme, listen, defPort string) string {
		_, port, err := net.SplitHostPort(listen)
		if err != nil || port == "" {
			port = defPort
		}
		base := scheme + "://" + net.JoinHostPort(host, port) + "/live/" + st.Slug
		if st.PublishMode == "path" {
			return base + "/" + key
		}
		return base + "?key=" + key
	}
	if s.Cfg.Media.RTMPListen != "" {
		out["rtmp"] = mk("rtmp", s.Cfg.Media.RTMPListen, "1935")
	}
	if s.Cfg.Media.RTMPSListen != "" {
		out["rtmps"] = mk("rtmps", s.Cfg.Media.RTMPSListen, "1936")
	}
	return out
}

func (s *Server) adminCreateStream(w http.ResponseWriter, r *http.Request) {
	var in core.StreamInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	st, key, err := s.Core.CreateStream(r.Context(), actor(r), in, false)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"stream": st, "key": key, "urls": s.pultURLs(st, key)})
}

func (s *Server) adminUpdateStream(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	var in core.StreamInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if err := s.Core.UpdateStream(r.Context(), actor(r), id, in); err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminDeleteStream(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		err = s.Core.DeleteStream(r.Context(), actor(r), id)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminRevealKey(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	key, err := s.Core.RevealKey(r.Context(), actor(r), id)
	if err != nil {
		writeErr(w, err)
		return
	}
	st, _ := s.Core.GetStream(r.Context(), id)
	if key == "" {
		writeJSON(w, 200, map[string]any{"key": "", "urls": map[string]string{}})
		return
	}
	writeJSON(w, 200, map[string]any{"key": key, "urls": s.pultURLs(st, key)})
}

func (s *Server) adminRotateKey(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	key, err := s.Core.RotateKey(r.Context(), actor(r), id)
	if err != nil {
		writeErr(w, err)
		return
	}
	st, _ := s.Core.GetStream(r.Context(), id)
	writeJSON(w, 200, map[string]any{"key": key, "urls": s.pultURLs(st, key)})
}

func (s *Server) adminRevokeKey(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		err = s.Core.RevokeKey(r.Context(), actor(r), id)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

type enabledIn struct {
	Enabled bool `json:"enabled"`
}

func (s *Server) adminSetPublish(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var in enabledIn
	if err == nil {
		err = readJSON(r, &in)
	}
	if err == nil {
		err = s.Core.SetPublishEnabled(r.Context(), actor(r), id, in.Enabled)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminSetViewing(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var in enabledIn
	if err == nil {
		err = readJSON(r, &in)
	}
	if err == nil {
		err = s.Core.SetViewingEnabled(r.Context(), actor(r), id, in.Enabled)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminKickPublisher(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	s.Core.Audit(r.Context(), actor(r), "publish_kick_request", "stream:"+strconv.FormatInt(id, 10), nil)
	s.Media.KickPublisher(r.Context(), id, "admin")
	ok(w)
}

func (s *Server) adminGuests(w http.ResponseWriter, r *http.Request) {
	gs, err := s.Core.ListGuests(r.Context(), r.URL.Query().Get("status"))
	if err != nil {
		writeErr(w, err)
		return
	}
	online := s.Hub.Online()
	for i := range gs {
		gs[i].Online = online[gs[i].SessionID] > 0
	}
	writeJSON(w, 200, gs)
}

func (s *Server) adminApproveGuest(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var in struct {
		StreamIDs []int64            `json:"streamIds"`
		Objects   []core.GrantObject `json:"objects"`
		Until     int64              `json:"until"`
		Note      string             `json:"note"`
	}
	if err == nil {
		err = readJSON(r, &in)
	}
	if err == nil {
		if len(in.Objects) > 0 {
			err = s.Core.ApproveGuestObjects(r.Context(), actor(r), id, in.Objects, in.Until, in.Note)
		} else {
			err = s.Core.ApproveGuest(r.Context(), actor(r), id, in.StreamIDs, in.Until, in.Note)
		}
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminRejectGuest(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var in struct{ Note string }
	if err == nil {
		readJSON(r, &in)
		err = s.Core.RejectGuest(r.Context(), actor(r), id, in.Note)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminEndGuest(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		err = s.Core.EndGuest(r.Context(), actor(r), id)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminUsers(w http.ResponseWriter, r *http.Request) {
	us, err := s.Core.ListUsers(r.Context())
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, us)
}

func (s *Server) adminCreateUser(w http.ResponseWriter, r *http.Request) {
	var in struct{ Username, DisplayName, Password, Role string }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	id, err := s.Core.CreateUser(r.Context(), actor(r), in.Username, in.DisplayName, in.Password, in.Role, true)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]int64{"id": id})
}

func (s *Server) adminUpdateUser(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var in struct{ DisplayName, Role string }
	if err == nil {
		err = readJSON(r, &in)
	}
	if err == nil {
		err = s.Core.UpdateUser(r.Context(), actor(r), id, in.DisplayName, in.Role)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminBlockUser(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var in struct{ Blocked bool }
	if err == nil {
		err = readJSON(r, &in)
	}
	if err == nil {
		err = s.Core.SetUserBlocked(r.Context(), actor(r), id, in.Blocked)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminResetPassword(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var in struct{ Password string }
	if err == nil {
		err = readJSON(r, &in)
	}
	if err == nil {
		err = s.Core.ResetPassword(r.Context(), actor(r), id, in.Password)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminLogoutAll(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		err = s.Core.LogoutEverywhere(r.Context(), actor(r), id, "admin_logout_all")
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminPermissions(w http.ResponseWriter, r *http.Request) {
	ps, err := s.Core.ListGrants(r.Context(), "", 0)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, ps)
}

func (s *Server) adminGrant(w http.ResponseWriter, r *http.Request) {
	var in struct {
		SubjectType string  `json:"subjectType"`
		SubjectID   int64   `json:"subjectId"`
		StreamIDs   []int64 `json:"streamIds"`
		ExpiresAt   *int64  `json:"expiresAt"`
	}
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if err := s.Core.Grant(r.Context(), actor(r), in.SubjectType, in.SubjectID, in.StreamIDs, in.ExpiresAt); err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminRevoke(w http.ResponseWriter, r *http.Request) {
	var in struct {
		SubjectType string `json:"subjectType"`
		SubjectID   int64  `json:"subjectId"`
		StreamID    int64  `json:"streamId"`
	}
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	start := time.Now()
	if err := s.Core.Revoke(r.Context(), actor(r), in.SubjectType, in.SubjectID, in.StreamID); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "enforcedInMs": time.Since(start).Milliseconds()})
}

func (s *Server) adminSessions(w http.ResponseWriter, r *http.Request) {
	ss, err := s.Core.ListWebSessions(r.Context())
	if err != nil {
		writeErr(w, err)
		return
	}
	online := s.Hub.Online()
	type out struct {
		core.SessionInfo
		Online bool `json:"online"`
		Tabs   int  `json:"openTabs"`
	}
	res := make([]out, 0, len(ss))
	for _, x := range ss {
		res = append(res, out{SessionInfo: x, Online: online[x.ID] > 0, Tabs: online[x.ID]})
	}
	writeJSON(w, 200, res)
}

func (s *Server) adminRevokeSession(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		err = s.Core.RevokeSession(r.Context(), actor(r), id)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminMedia(w http.ResponseWriter, r *http.Request) {
	live, err := s.Core.LiveMediaSessions(r.Context())
	if err != nil {
		writeErr(w, err)
		return
	}
	ended, _ := s.Core.RecentEndedMedia(r.Context(), 50)
	writeJSON(w, 200, map[string]any{"live": live, "recent": ended})
}

func (s *Server) adminKickMedia(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		err = s.Media.KickMedia(r.Context(), actor(r), id)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminAudit(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit <= 0 || limit > 1000 {
		limit = 200
	}
	before, _ := strconv.ParseInt(q.Get("before"), 10, 64)
	if before <= 0 {
		before = 1 << 62
	}
	action := q.Get("action")
	rows, err := s.Core.St.DB.QueryContext(r.Context(), `SELECT id,ts,actor_type,COALESCE(actor_id,0),actor_name,action,target,details,ip FROM audit_log
	  WHERE id < ? AND (?='' OR action LIKE ?||'%') ORDER BY id DESC LIMIT ?`, before, action, action, limit)
	if err != nil {
		writeErr(w, err)
		return
	}
	defer rows.Close()
	type rec struct {
		ID        int64  `json:"id"`
		TS        int64  `json:"ts"`
		ActorType string `json:"actorType"`
		ActorID   int64  `json:"actorId"`
		ActorName string `json:"actorName"`
		Action    string `json:"action"`
		Target    string `json:"target"`
		Details   string `json:"details"`
		IP        string `json:"ip"`
	}
	out := []rec{}
	for rows.Next() {
		var x rec
		if err := rows.Scan(&x.ID, &x.TS, &x.ActorType, &x.ActorID, &x.ActorName, &x.Action, &x.Target, &x.Details, &x.IP); err != nil && err != sql.ErrNoRows {
			writeErr(w, err)
			return
		}
		out = append(out, x)
	}
	writeJSON(w, 200, map[string]any{"items": out, "retentionDays": s.Cfg.Security.AuditRetainDays})
}

func (s *Server) adminEmergency(w http.ResponseWriter, r *http.Request) {
	var in struct{ On bool }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	start := time.Now()
	if err := s.Core.SetEmergencyStop(r.Context(), actor(r), in.On); err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"ok": true, "enforcedInMs": time.Since(start).Milliseconds()})
}

func (s *Server) adminSystem(w http.ResponseWriter, r *http.Request) {
	info := map[string]any{}
	if s.Hooks.SystemInfo != nil {
		info = s.Hooks.SystemInfo()
	}
	st, _ := s.Core.State(r.Context())
	info["state"] = st
	writeJSON(w, 200, info)
}

func (s *Server) adminGuestSettings(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Enabled bool `json:"enabled"`
		Minutes int  `json:"minutes"`
	}
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if err := s.Core.SetGuestSettings(r.Context(), actor(r), in.Enabled, in.Minutes); err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminInstance(w http.ResponseWriter, r *http.Request) {
	var in struct {
		State   string `json:"state"`
		Confirm string `json:"confirm"`
	}
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if in.State == "active" && in.Confirm != "ESKI SERVER O'CHIRILDI" {
		writeErr(w, &core.Error{Status: 400, Code: "confirm", Msg: "Tasdiq matnini aynan kiriting: ESKI SERVER O'CHIRILDI"})
		return
	}
	if err := s.Core.SetInstanceState(r.Context(), actor(r), in.State); err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminBackup(w http.ResponseWriter, r *http.Request) {
	var in struct{ Passphrase string }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if len([]rune(in.Passphrase)) < 12 {
		writeErr(w, &core.Error{Status: 400, Code: "weak", Msg: "Backup paroli kamida 12 belgi bo'lishi kerak"})
		return
	}
	if s.Hooks.Backup == nil {
		writeErr(w, core.ErrNotFound)
		return
	}
	name, err := s.Hooks.Backup(r.Context(), in.Passphrase)
	if err != nil {
		s.Log.Error("backup failed", "err", err)
		writeErr(w, &core.Error{Status: 500, Code: "backup_failed", Msg: "Backup yaratilmadi: " + err.Error()})
		return
	}
	s.Core.Audit(r.Context(), actor(r), "backup_create", name, nil)
	writeJSON(w, 200, map[string]string{"name": name})
}

func (s *Server) adminListBackups(w http.ResponseWriter, r *http.Request) {
	if s.Hooks.ListBackups == nil {
		writeJSON(w, 200, []any{})
		return
	}
	l, err := s.Hooks.ListBackups()
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, l)
}

func (s *Server) adminDownloadBackup(w http.ResponseWriter, r *http.Request) {
	if s.Hooks.BackupPath == nil {
		writeErr(w, core.ErrNotFound)
		return
	}
	p, err := s.Hooks.BackupPath(r.PathValue("name"))
	if err != nil {
		writeErr(w, core.ErrNotFound)
		return
	}
	f, err := os.Open(p)
	if err != nil {
		writeErr(w, core.ErrNotFound)
		return
	}
	defer f.Close()
	st, _ := f.Stat()
	s.Core.Audit(r.Context(), actor(r), "backup_download", r.PathValue("name"), nil)
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", `attachment; filename="`+r.PathValue("name")+`"`)
	http.ServeContent(w, r, r.PathValue("name"), st.ModTime(), f)
}
