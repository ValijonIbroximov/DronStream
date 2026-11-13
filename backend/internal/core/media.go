package core

import (
	"context"
	"database/sql"
	"fmt"
	"net"
	"net/url"
	"strings"

	"dronstream/internal/secure"
)

type querier interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// Decision is the result of the single authorisation function used by ticket
// issuance, the MediaMTX hook and the reconciler.
type Decision struct {
	OK     bool
	Reason string
	Until  int64 // latest instant the access is valid (unix ms), 0 = unbounded
}

func deny(r string) Decision { return Decision{Reason: r} }

// AuthorizeView is the exported read-only check (used by the reconciler).
func (s *Service) AuthorizeView(ctx context.Context, wsID, streamID int64, sys SystemState) Decision {
	return s.authorizeView(ctx, s.St.DB, wsID, streamID, s.nowMs(), sys)
}

// ReasonText converts a reason code into an Uzbek message for viewers.
func ReasonText(r string) string {
	switch r {
	case "emergency_stop":
		return "Administrator barcha tomoshani favqulodda to'xtatdi"
	case "stream_closed":
		return "Bu stream administrator tomonidan yopildi"
	case "stream_deleted":
		return "Stream o'chirildi"
	case "session_ended", "logout":
		return "Sessiyangiz yakunlandi. Qayta kiring"
	case "session_expired":
		return "Sessiya muddati tugadi. Qayta kiring"
	case "user_blocked":
		return "Hisobingiz bloklandi"
	case "password_reset":
		return "Parolingiz tiklandi. Qayta kiring"
	case "guest_pending":
		return "So'rovingiz administrator tasdig'ini kutmoqda"
	case "guest_rejected":
		return "So'rovingiz rad etildi"
	case "guest_ended":
		return "Mehmon sessiyangiz administrator tomonidan yakunlandi"
	case "guest_expired", "permission_expired":
		return "Ruxsat muddati tugadi"
	case "no_permission":
		return "Bu streamni ko'rishga ruxsatingiz yo'q"
	case "permission_revoked":
		return "Administrator bu stream uchun ruxsatingizni bekor qildi"
	case "kicked_by_admin":
		return "Administrator ulanishingizni uzdi"
	case "too_many_sessions":
		return "Bir vaqtda ochiq videolar soni chegaradan oshdi"
	case "lease_expired":
		return "Ulanish ijarasi tugadi — qayta ulanmoqda"
	case "instance_standby":
		return "Server kutish rejimida (ko'chirish tugallanmagan)"
	case "instance_migrated":
		return "Bu server boshqa kompyuterga ko'chirilgan va o'chirilgan"
	case "auth_unavailable":
		return "Ruxsat xizmati vaqtincha ishlamayapti"
	case "link_revoked":
		return "Administrator bu maxsus havolani bekor qildi"
	case "link_expired":
		return "Maxsus havolaning amal qilish muddati tugadi"
	case "link_not_started":
		return "Maxsus havola hali kuchga kirmagan"
	case "link_used_up":
		return "Bu havoladan foydalanish limiti tugagan (u allaqachon ishlatilgan)"
	case "link_parallel_limit":
		return "Bu havola orqali bir vaqtdagi sessiyalar soni chegarada. Keyinroq urining"
	case "invalid_link":
		return "Havola noto'g'ri yoki yangilangan"
	case "link_pending_approval":
		return "So'rovingiz administrator tasdig'ini kutmoqda. Havolaning o'zi kirish huquqini bermaydi"
	case "link_rejected":
		return "Administrator bu kirish so'rovini rad etdi"
	case "link_too_many_requests":
		return "Bu havola bo'yicha tasdiq kutayotgan so'rovlar juda ko'p. Administrator ularni ko'rib chiqqach qayta urining"
	case "approval_not_pending":
		return "Bu so'rov allaqachon ko'rib chiqilgan yoki yakunlangan"
	case "content_hidden", "content_deleted":
		return "Bu kontent endi mavjud emas yoki yashirilgan"
	}
	return "Ulanish uzildi"
}

// ---- tickets ----

type Ticket struct {
	Token      string `json:"ticket"`
	ExpiresAt  int64  `json:"ticketExpiresAt"`
	LeaseUntil int64  `json:"leaseUntil"`
	nonce      string
}

func sessionSubjectOf(sess *Session) (string, int64) {
	switch sess.Kind {
	case "guest":
		return "guest", sess.GuestID
	case "link":
		return "link", sess.LinkID
	}
	return "user", sess.UserID
}

// SlotSessionLimit is how many media sessions one player slot may hold at
// once: the live one plus one make-before-break lease renewal.
const SlotSessionLimit = 2

// activeCounts counts in units of "player slots". A slot is one video tile:
// (browser session, stream, client tab). The per-subject limit is about how
// many tiles a subject has open, so the short overlap of a lease renewal (a
// second session in the SAME slot) must not count twice, and an outstanding
// ticket for a slot that is already open must not count either.
//
//	others = distinct slots of this subject, not counting the requested one
//	here   = non-ended media sessions inside the requested slot
func (s *Service) activeCounts(ctx context.Context, q querier, sess *Session, streamID int64, tab string, now int64) (others, here int, err error) {
	subjType, subjID := sessionSubjectOf(sess)
	col := subjectSessionsCol(subjType)
	err = q.QueryRowContext(ctx, `SELECT
	   (SELECT count(*) FROM (
	      SELECT web_session_id, stream_id, client_tab FROM media_sessions WHERE subject_type=? AND subject_id=? AND status!='ended'
	      UNION
	      SELECT t.web_session_id, t.stream_id, t.client_tab FROM playback_tickets t JOIN web_sessions w ON w.id=t.web_session_id
	        WHERE w.`+col+`=? AND w.kind=? AND t.used_at IS NULL AND t.expires_at>?
	    ) x WHERE NOT (x.web_session_id=? AND x.stream_id=? AND x.client_tab=?)),
	   (SELECT count(*) FROM media_sessions WHERE web_session_id=? AND stream_id=? AND client_tab=? AND status!='ended')`,
		subjType, subjID, subjID, sess.Kind, now, sess.ID, streamID, tab, sess.ID, streamID, tab).Scan(&others, &here)
	return
}

// tooManyErr explains which limit was hit and what the viewer can do.
func tooManyErr(scope string, used, max int) *Error {
	msg := ReasonText("too_many_sessions")
	if scope == "subject" {
		msg = fmt.Sprintf("Bir vaqtda ochiq videolar soni chegaraga yetdi (%d/%d). Boshqa oyna yoki qurilmadagi videolarni yoping yoki keraksiz joylarni bo'shating, so'ng qayta urining", used, max)
	} else if scope == "slot" {
		msg = "Shu joydagi oldingi ulanishlar hali yopilmagan. Bir necha soniyadan keyin qayta urinib ko'ring"
	}
	return &Error{Status: 429, Code: "too_many_sessions", Msg: msg, Data: map[string]any{"scope": scope, "used": used, "max": max}}
}

// SlotSessions lists the non-ended media sessions of one player slot, newest first.
func (s *Service) SlotSessions(ctx context.Context, sess *Session, streamID int64, tab string) ([]*MediaSession, error) {
	return s.queryMedia(ctx, mediaSelect+` WHERE m.web_session_id=? AND m.stream_id=? AND m.client_tab=? AND m.status!='ended' ORDER BY m.created_at DESC, m.id DESC`,
		sess.ID, streamID, cleanText(tab, 40, false))
}

// DropPendingMedia silently ends a media session that the auth hook recorded
// but that MediaMTX then refused to start (for example the source is not
// publishing). Without this the phantom "pending" row would occupy the slot
// until the reconciler's grace period ends.
func (s *Service) DropPendingMedia(ctx context.Context, nonce, reason string) {
	if nonce == "" {
		return
	}
	res, err := s.St.DB.ExecContext(ctx, `UPDATE media_sessions SET status='ended', ended_at=?, end_reason=? WHERE nonce=? AND status='pending'`, s.nowMs(), reason, nonce)
	if err != nil {
		return
	}
	if n, _ := res.RowsAffected(); n > 0 {
		s.Events.ToAdmins("media", nil)
	}
}

// IssueTicket creates a single-use, short-lived playback ticket bound to the
// browser session, the stream and a nonce that the WHEP proxy adds to the
// MediaMTX URL.
func (s *Service) IssueTicket(ctx context.Context, sess *Session, streamID int64, tab, ip string) (*Ticket, error) {
	sys, err := s.State(ctx)
	if err != nil {
		return nil, err
	}
	now := s.nowMs()
	d := s.authorizeView(ctx, s.St.DB, sess.ID, streamID, now, sys)
	if !d.OK {
		return nil, &Error{Status: 403, Code: d.Reason, Msg: ReasonText(d.Reason)}
	}
	tab = cleanText(tab, 40, false)
	others, here, err := s.activeCounts(ctx, s.St.DB, sess, streamID, tab, now)
	if err != nil {
		return nil, err
	}
	if !sess.IsAdmin() && others >= s.Cfg.Media.MaxPerUser {
		return nil, tooManyErr("subject", others, s.Cfg.Media.MaxPerUser)
	}
	if here >= SlotSessionLimit { // one live + one make-before-break renewal per slot
		return nil, tooManyErr("slot", here, SlotSessionLimit)
	}
	t := &Ticket{Token: secure.Token(32), nonce: secure.Token(12), ExpiresAt: now + s.Cfg.TicketTTL().Milliseconds()}
	t.LeaseUntil = minPositive(now+s.Cfg.Lease().Milliseconds(), d.Until)
	if _, err := s.St.DB.ExecContext(ctx, `INSERT INTO playback_tickets(token_hash,web_session_id,stream_id,nonce,client_tab,created_at,expires_at) VALUES(?,?,?,?,?,?,?)`,
		secure.Hash(t.Token), sess.ID, streamID, t.nonce, tab, now, t.ExpiresAt); err != nil {
		return nil, err
	}
	return t, nil
}

// TicketForProxy validates that the ticket belongs to this browser session
// and stream (so a leaked ticket is useless from another browser) and
// returns the MediaMTX path and nonce to use. It does not consume the ticket;
// the MediaMTX hook does, atomically.
func (s *Service) TicketForProxy(ctx context.Context, sess *Session, streamID int64, token string) (path, nonce string, err error) {
	var wsID, sID, exp int64
	var used sql.NullInt64
	err = s.St.DB.QueryRowContext(ctx, `SELECT web_session_id, stream_id, nonce, expires_at, used_at FROM playback_tickets WHERE token_hash=?`, secure.Hash(token)).
		Scan(&wsID, &sID, &nonce, &exp, &used)
	if err != nil || wsID != sess.ID || sID != streamID || used.Valid || exp <= s.nowMs() {
		return "", "", &Error{Status: 403, Code: "bad_ticket", Msg: "Ko'rish chiptasi yaroqsiz yoki muddati o'tgan"}
	}
	st, err := s.GetStream(ctx, streamID)
	if err != nil {
		return "", "", err
	}
	path, err = s.MediaPath(st)
	return path, nonce, err
}

// HookRequest mirrors the MediaMTX HTTP-auth payload (v1.21.3).
type HookRequest struct {
	User      string `json:"user"`
	Password  string `json:"password"`
	Token     string `json:"token"`
	IP        string `json:"ip"`
	Action    string `json:"action"`
	Path      string `json:"path"`
	Protocol  string `json:"protocol"`
	ID        string `json:"id"`
	Query     string `json:"query"`
	UserAgent string `json:"userAgent"`
}

// HookRead authorises a WebRTC read. In one write transaction it consumes the
// ticket, re-checks authorisation against current DB state and records the
// media session, so a concurrent revoke is either seen here (deny) or sees
// this session (and kicks it). Returns the lease end (unix ms).
func (s *Service) HookRead(ctx context.Context, r HookRequest) (int64, error) {
	if r.Protocol != "webrtc" || r.Token == "" || r.ID == "" {
		return 0, ErrForbidden
	}
	qv, _ := url.ParseQuery(r.Query)
	nonce := qv.Get("ds")
	sys, err := s.State(ctx)
	if err != nil {
		return 0, err
	}
	var lease int64
	var denyReason string
	var auditActor Actor
	var auditTarget string
	err = s.St.Tx(ctx, func(tx *sql.Tx) error {
		now := s.nowMs()
		var tid, wsID, streamID, exp int64
		var tNonce, tab string
		var used sql.NullInt64
		err := tx.QueryRowContext(ctx, `SELECT id, web_session_id, stream_id, nonce, client_tab, expires_at, used_at FROM playback_tickets WHERE token_hash=?`, secure.Hash(r.Token)).
			Scan(&tid, &wsID, &streamID, &tNonce, &tab, &exp, &used)
		if err != nil {
			denyReason = "unknown_ticket"
			return ErrForbidden
		}
		if used.Valid {
			denyReason = "ticket_reused"
			return ErrForbidden
		}
		if exp <= now {
			denyReason = "ticket_expired"
			return ErrForbidden
		}
		// From here on the ticket is consumed, even if the request is denied.
		if _, err := tx.ExecContext(ctx, `UPDATE playback_tickets SET used_at=? WHERE id=?`, now, tid); err != nil {
			return err
		}
		if nonce == "" || nonce != tNonce {
			denyReason = "nonce_mismatch"
			return nil
		}
		st, err := scanStream(tx.QueryRowContext(ctx, `SELECT `+streamCols+` FROM streams WHERE id=?`, streamID))
		if err != nil {
			denyReason = "stream_deleted"
			return nil
		}
		auditTarget = "stream:" + st.Slug
		path, err := s.MediaPath(st)
		if err != nil || path != r.Path {
			denyReason = "path_mismatch"
			return nil
		}
		d := s.authorizeView(ctx, tx, wsID, streamID, now, sys)
		var sess *Session
		sess, _, _, _, err = s.scanSession(tx.QueryRowContext(ctx, sessionSelect+` WHERE ws.id=?`, wsID))
		if err != nil {
			denyReason = "session_ended"
			return nil // commit ticket consumption
		}
		auditActor = sess.Actor(r.IP)
		auditTarget = "stream:" + st.Slug
		if !d.OK {
			denyReason = d.Reason
			return nil
		}
		others, here, err := s.activeCounts(ctx, tx, sess, streamID, tab, now)
		if err != nil {
			return err
		}
		// the ticket itself is no longer counted (used_at set above)
		if (!sess.IsAdmin() && others >= s.Cfg.Media.MaxPerUser) || here >= SlotSessionLimit {
			denyReason = "too_many_sessions"
			return nil
		}
		lease = minPositive(now+s.Cfg.Lease().Milliseconds(), d.Until)
		subjType, subjID := sessionSubjectOf(sess)
		_, err = tx.ExecContext(ctx, `INSERT INTO media_sessions(mtx_id,nonce,ticket_id,web_session_id,subject_type,subject_id,stream_id,client_tab,status,created_at,last_seen_at,lease_expires_at,remote_addr,user_agent)
		  VALUES(?,?,?,?,?,?,?,?,'pending',?,?,?,?,?)`, r.ID, nonce, tid, wsID, subjType, subjID, streamID, tab, now, now, lease, r.IP, cleanText(r.UserAgent, 300, false))
		if err != nil {
			denyReason = "duplicate_session"
			return ErrForbidden
		}
		s.auditExec(ctx, tx, auditActor, "view_connect", auditTarget, map[string]any{"mtx": shortID(r.ID), "session": wsID, "tab": tab})
		return nil
	})
	if err == nil && denyReason == "" {
		s.Events.ToAdmins("media", nil)
		return lease, nil
	}
	if denyReason == "" {
		denyReason = "internal_error"
	}
	a := auditActor
	if a.Type == "" {
		a = Actor{Type: "anonymous", IP: r.IP}
	}
	s.AuditRateLimited(ctx, "rd:"+r.IP+":"+denyReason, a, "view_denied", auditTarget, map[string]any{"reason": denyReason, "protocol": r.Protocol})
	if err != nil && err != ErrForbidden {
		return 0, err
	}
	return 0, &Error{Status: 403, Code: denyReason, Msg: ReasonText(denyReason)}
}

func shortID(id string) string {
	if len(id) > 8 {
		return id[:8]
	}
	return id
}

// ParseMediaPath splits "live/<slug>[/<key>]".
func ParseMediaPath(p string) (slug, key string, ok bool) {
	parts := strings.Split(p, "/")
	if len(parts) < 2 || len(parts) > 3 || parts[0] != "live" || !validSlug(parts[1]) {
		return "", "", false
	}
	if len(parts) == 3 {
		if parts[2] == "" {
			return "", "", false
		}
		return parts[1], parts[2], true
	}
	return parts[1], "", true
}

// HookPublish authorises a publisher: the key must match exactly this stream
// (keys are per stream; a key never grants read access).
func (s *Service) HookPublish(ctx context.Context, r HookRequest) error {
	fail := func(reason string, slug string) error {
		s.AuditRateLimited(ctx, "pub:"+r.IP+":"+slug+":"+reason, Actor{Type: "publisher", IP: r.IP}, "publish_denied", "stream:"+slug,
			map[string]any{"reason": reason, "protocol": r.Protocol})
		return &Error{Status: 401, Code: reason, Msg: "publish denied"}
	}
	sys, err := s.State(ctx)
	if err != nil {
		return err
	}
	slug, pathKey, ok := ParseMediaPath(r.Path)
	if !ok {
		return fail("bad_path", "?")
	}
	if sys.InstanceState != "active" {
		return fail("instance_"+sys.InstanceState, slug)
	}
	st, err := s.StreamBySlug(ctx, slug)
	if err != nil {
		return fail("unknown_stream", slug)
	}
	if (st.PublishMode == "query") != (pathKey == "") {
		return fail("wrong_url_form", slug)
	}
	key := pathKey
	if key == "" {
		qv, _ := url.ParseQuery(r.Query)
		key = qv.Get("key")
	}
	if key == "" {
		key = r.Password
	}
	if key == "" {
		key = r.Token
	}
	if !st.HasKey {
		return fail("key_revoked", slug)
	}
	if key == "" || !secure.Equal(secure.Hash(key), st.keyHash) {
		return fail("bad_key", slug)
	}
	if !st.PublishEnabled {
		return fail("publish_blocked", slug)
	}
	ip := net.ParseIP(r.IP)
	if st.IsDemo {
		if r.Protocol != "webrtc" || ip == nil || !ip.IsLoopback() {
			return fail("demo_local_only", slug)
		}
	} else if r.Protocol != "rtmp" && r.Protocol != "rtmps" {
		return fail("protocol_not_allowed", slug)
	}
	if busy, err := s.PathBusy(ctx, r.Path); err != nil {
		return fail("busy_check_failed", slug)
	} else if busy {
		s.Audit(ctx, Actor{Type: "publisher", IP: r.IP}, "publish_rejected_busy", "stream:"+slug, map[string]any{"protocol": r.Protocol})
		s.Events.ToAdmins("alert", map[string]any{"kind": "publish_busy", "stream": st.Name})
		return &Error{Status: 401, Code: "busy", Msg: "already publishing"}
	}
	s.Audit(ctx, Actor{Type: "publisher", IP: r.IP}, "publish_start", "stream:"+slug, map[string]any{"protocol": r.Protocol, "keyVersion": st.KeyVersion, "mtx": shortID(r.ID)})
	s.Events.ToAdmins("streams", nil)
	return nil
}

// ---- media sessions ----

type MediaSession struct {
	ID            int64  `json:"id"`
	MtxID         string `json:"-"`
	WebSessionID  int64  `json:"webSessionId"`
	SubjectType   string `json:"subjectType"`
	SubjectID     int64  `json:"subjectId"`
	SubjectName   string `json:"subjectName"`
	StreamID      int64  `json:"streamId"`
	StreamName    string `json:"streamName"`
	Tab           string `json:"tab"`
	Status        string `json:"status"`
	CreatedAt     int64  `json:"createdAt"`
	EstablishedAt *int64 `json:"establishedAt"`
	LastSeen      int64  `json:"lastSeen"`
	LeaseUntil    int64  `json:"leaseUntil"`
	RemoteAddr    string `json:"remoteAddr"`
	UserAgent     string `json:"userAgent"`
	BytesSent     int64  `json:"bytesSent"`
	EndedAt       *int64 `json:"endedAt,omitempty"`
	EndReason     string `json:"endReason,omitempty"`
	WhepResource  string `json:"-"`
}

const mediaSelect = `SELECT m.id,m.mtx_id,m.web_session_id,m.subject_type,m.subject_id,
 CASE m.subject_type WHEN 'user' THEN COALESCE((SELECT display_name FROM users WHERE id=m.subject_id),'?') WHEN 'link' THEN COALESCE((SELECT 'Havola: '||name FROM access_links WHERE id=m.subject_id),'?') ELSE COALESCE((SELECT display_name FROM guests WHERE id=m.subject_id),'?') END,
 m.stream_id, COALESCE((SELECT name FROM streams WHERE id=m.stream_id),'?'), m.client_tab, m.status, m.created_at, m.established_at, m.last_seen_at, m.lease_expires_at,
 m.remote_addr, m.user_agent, m.bytes_sent, m.ended_at, m.end_reason, m.whep_resource FROM media_sessions m`

func scanMedia(rows *sql.Rows) (*MediaSession, error) {
	var m MediaSession
	var est, ended sql.NullInt64
	err := rows.Scan(&m.ID, &m.MtxID, &m.WebSessionID, &m.SubjectType, &m.SubjectID, &m.SubjectName, &m.StreamID, &m.StreamName, &m.Tab, &m.Status, &m.CreatedAt, &est, &m.LastSeen, &m.LeaseUntil,
		&m.RemoteAddr, &m.UserAgent, &m.BytesSent, &ended, &m.EndReason, &m.WhepResource)
	m.EstablishedAt, m.EndedAt = nullable(est), nullable(ended)
	return &m, err
}

func (s *Service) LiveMediaSessions(ctx context.Context) ([]*MediaSession, error) {
	return s.queryMedia(ctx, mediaSelect+` WHERE m.status!='ended' ORDER BY m.created_at`)
}

func (s *Service) RecentEndedMedia(ctx context.Context, limit int) ([]*MediaSession, error) {
	return s.queryMedia(ctx, mediaSelect+` WHERE m.status='ended' ORDER BY m.ended_at DESC LIMIT ?`, limit)
}

func (s *Service) queryMedia(ctx context.Context, q string, args ...any) ([]*MediaSession, error) {
	rows, err := s.St.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*MediaSession{}
	for rows.Next() {
		m, err := scanMedia(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Service) MediaByID(ctx context.Context, id int64) (*MediaSession, error) {
	ms, err := s.queryMedia(ctx, mediaSelect+` WHERE m.id=?`, id)
	if err != nil {
		return nil, err
	}
	if len(ms) == 0 {
		return nil, ErrNotFound
	}
	return ms[0], nil
}

func (s *Service) MediaByMtxID(ctx context.Context, mtxID string) (*MediaSession, error) {
	ms, err := s.queryMedia(ctx, mediaSelect+` WHERE m.mtx_id=?`, mtxID)
	if err != nil {
		return nil, err
	}
	if len(ms) == 0 {
		return nil, ErrNotFound
	}
	return ms[0], nil
}

func (s *Service) SetWhepResource(ctx context.Context, mtxNonce, resource string) {
	s.St.DB.ExecContext(ctx, `UPDATE media_sessions SET whep_resource=? WHERE nonce=?`, resource, mtxNonce)
}

// MediaByResource finds the live media session for a WHEP resource owned by sess.
func (s *Service) MediaByResource(ctx context.Context, sess *Session, resource string) (*MediaSession, error) {
	ms, err := s.queryMedia(ctx, mediaSelect+` WHERE m.whep_resource=? AND m.web_session_id=?`, resource, sess.ID)
	if err != nil {
		return nil, err
	}
	if len(ms) == 0 || resource == "" {
		return nil, ErrNotFound
	}
	return ms[0], nil
}

func (s *Service) UpdateMediaStats(ctx context.Context, id int64, established bool, bytes int64, remote string) {
	now := s.nowMs()
	if established {
		s.St.DB.ExecContext(ctx, `UPDATE media_sessions SET status='active', established_at=COALESCE(established_at,?), last_seen_at=?, bytes_sent=?, remote_addr=CASE WHEN ?='' THEN remote_addr ELSE ? END WHERE id=? AND status!='ended'`, now, now, bytes, remote, remote, id)
	} else {
		s.St.DB.ExecContext(ctx, `UPDATE media_sessions SET last_seen_at=?, bytes_sent=? WHERE id=? AND status!='ended'`, now, bytes, id)
	}
}

// EndMedia marks a media session ended (idempotent) and notifies the viewer.
func (s *Service) EndMedia(ctx context.Context, m *MediaSession, reason string) {
	res, err := s.St.DB.ExecContext(ctx, `UPDATE media_sessions SET status='ended', ended_at=?, end_reason=? WHERE id=? AND status!='ended'`, s.nowMs(), reason, m.ID)
	if err != nil {
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return
	}
	if reason != "disconnected" && reason != "lease_expired" && reason != "client_closed" && reason != "superseded" {
		s.Audit(ctx, Actor{Type: "system", Name: "media"}, "view_disconnect", "stream:"+itoa(m.StreamID),
			map[string]any{"reason": reason, "subject": m.SubjectType + ":" + itoa(m.SubjectID), "mtx": shortID(m.MtxID)})
	}
	s.Events.ToSession(m.WebSessionID, "media_ended", map[string]any{"streamId": m.StreamID, "tab": m.Tab, "reason": reason, "message": ReasonText(reason)})
	s.Events.ToAdmins("media", nil)
}

// ViewStatus tells a viewer why it cannot (or can) watch a stream.
func (s *Service) ViewStatus(ctx context.Context, sess *Session, streamID int64) (Decision, error) {
	sys, err := s.State(ctx)
	if err != nil {
		return Decision{}, err
	}
	return s.authorizeView(ctx, s.St.DB, sess.ID, streamID, s.nowMs(), sys), nil
}

// ViewableStreams lists streams the session may watch now (never the whole
// list for unapproved users).
func (s *Service) ViewableStreams(ctx context.Context, sess *Session) ([]*Stream, map[int64]int64, error) {
	all, err := s.ListStreams(ctx)
	if err != nil {
		return nil, nil, err
	}
	sys, err := s.State(ctx)
	if err != nil {
		return nil, nil, err
	}
	out := []*Stream{}
	until := map[int64]int64{}
	now := s.nowMs()
	for _, st := range all {
		d := s.authorizeView(ctx, s.St.DB, sess.ID, st.ID, now, sys)
		if d.OK {
			out = append(out, st)
			until[st.ID] = d.Until
		}
	}
	return out, until, nil
}

type SessionInfo struct {
	Session
	Revoked     bool   `json:"revoked"`
	MediaCount  int    `json:"mediaCount"`
	SubjectName string `json:"subjectName"`
}

// ListWebSessions returns non-revoked, non-expired browser sessions.
func (s *Service) ListWebSessions(ctx context.Context) ([]SessionInfo, error) {
	rows, err := s.St.DB.QueryContext(ctx, sessionSelect+` WHERE ws.revoked_at IS NULL AND ws.expires_at > ? ORDER BY ws.last_seen_at DESC LIMIT 1000`, s.nowMs())
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []SessionInfo{}
	for rows.Next() {
		sess, _, _, _, err := s.scanSession(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, SessionInfo{Session: *sess})
	}
	rows.Close()
	for i := range out {
		s.St.DB.QueryRowContext(ctx, `SELECT count(*) FROM media_sessions WHERE web_session_id=? AND status!='ended'`, out[i].ID).Scan(&out[i].MediaCount)
	}
	return out, nil
}
