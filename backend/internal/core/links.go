package core

import (
	"context"
	"database/sql"
	"regexp"
	"time"

	"dronstream/internal/secure"
)

// Link is a login-free special access link. The token is shown only to the
// admin; the DB stores its SHA-256 (for verification) and an AES-GCM copy
// encrypted with the master key (kept outside the DB, DPAPI-protected) so the
// full link/QR can be displayed again.
type Link struct {
	ID             int64  `json:"id"`
	Name           string `json:"name"`
	Preset         string `json:"preset"` // once | multi | timed | custom
	MaxUses        *int64 `json:"maxUses"`
	UsesCount      int64  `json:"usesCount"`
	MaxParallel    *int64 `json:"maxParallel"`
	StartsAt       *int64 `json:"startsAt"`
	EndsAt         *int64 `json:"endsAt"`
	SessionMinutes int64  `json:"sessionMinutes"`
	ForUserID      *int64 `json:"forUserId"`
	ForUserName    string `json:"forUserName,omitempty"`
	Note           string `json:"note"`
	TokenVersion   int64  `json:"tokenVersion"`
	CreatedAt      int64  `json:"createdAt"`
	RevokedAt      *int64 `json:"revokedAt"`
	ActiveSessions int64  `json:"activeSessions"`
	StatusCode     string `json:"status"`
	tokenEnc       []byte
}

// Status: pending | active | expired | used_up | revoked
func (l *Link) Status(now int64) string {
	switch {
	case l.RevokedAt != nil:
		return "revoked"
	case l.EndsAt != nil && *l.EndsAt <= now:
		return "expired"
	case l.StartsAt != nil && *l.StartsAt > now:
		return "pending"
	case l.MaxUses != nil && l.UsesCount >= *l.MaxUses:
		return "used_up"
	}
	return "active"
}

func LinkStatusText(st string) string {
	return map[string]string{"pending": "Kutilmoqda", "active": "Faol", "expired": "Tugagan", "used_up": "Limit tugagan", "revoked": "Bekor qilingan"}[st]
}

const linkCols = `l.id,l.name,l.preset,l.max_uses,l.uses_count,l.max_parallel,l.starts_at,l.ends_at,l.session_minutes,l.for_user_id,COALESCE((SELECT display_name FROM users WHERE id=l.for_user_id),''),l.note,l.token_version,l.created_at,l.revoked_at,l.token_enc,
 (SELECT count(*) FROM web_sessions w WHERE w.link_id=l.id AND w.revoked_at IS NULL AND w.expires_at > ?)`

func scanLink(row interface{ Scan(...any) error }, now int64) (*Link, error) {
	var l Link
	var mu, mp, sa, ea, fu, rv sql.NullInt64
	err := row.Scan(&l.ID, &l.Name, &l.Preset, &mu, &l.UsesCount, &mp, &sa, &ea, &l.SessionMinutes, &fu, &l.ForUserName, &l.Note, &l.TokenVersion, &l.CreatedAt, &rv, &l.tokenEnc, &l.ActiveSessions)
	if err != nil {
		return nil, err
	}
	l.MaxUses, l.MaxParallel, l.StartsAt, l.EndsAt, l.ForUserID, l.RevokedAt = nullable(mu), nullable(mp), nullable(sa), nullable(ea), nullable(fu), nullable(rv)
	l.StatusCode = l.Status(now)
	return &l, nil
}

func (s *Service) GetLink(ctx context.Context, id int64) (*Link, error) {
	now := s.nowMs()
	l, err := scanLink(s.St.DB.QueryRowContext(ctx, `SELECT `+linkCols+` FROM access_links l WHERE l.id=?`, now, id), now)
	if isNoRows(err) {
		return nil, ErrNotFound
	}
	return l, err
}

func (s *Service) ListLinks(ctx context.Context) ([]*Link, error) {
	now := s.nowMs()
	rows, err := s.St.DB.QueryContext(ctx, `SELECT `+linkCols+` FROM access_links l ORDER BY l.revoked_at IS NOT NULL, l.created_at DESC`, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Link{}
	for rows.Next() {
		l, err := scanLink(rows, now)
		if err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

// LinkToken returns the plaintext token (admin only; caller audits).
func (s *Service) LinkToken(l *Link) (string, error) {
	b, err := secure.Open(s.MasterKey, l.tokenEnc, []byte("link:"+itoa(l.ID)))
	return string(b), err
}

type LinkInput struct {
	Name           string        `json:"name"`
	Preset         string        `json:"preset"`
	MaxUses        *int64        `json:"maxUses"`
	MaxParallel    *int64        `json:"maxParallel"`
	StartsAt       *int64        `json:"startsAt"`
	EndsAt         *int64        `json:"endsAt"`
	SessionMinutes int64         `json:"sessionMinutes"`
	ForUserID      *int64        `json:"forUserId"`
	Note           string        `json:"note"`
	Objects        []GrantObject `json:"objects"`
}

func pi(v int64) *int64 { return &v }

// normalize applies the preset rules. Presets are only UI shortcuts; the
// model always stores explicit uses / parallel / time limits.
func (in *LinkInput) normalize(now int64, creating bool) error {
	in.Name = cleanText(in.Name, 80, false)
	in.Note = cleanText(in.Note, 300, false)
	if in.Name == "" {
		return errf(400, "bad_name", "Havola nomini (oluvchi yoki maqsad) kiriting")
	}
	if in.SessionMinutes < 5 || in.SessionMinutes > 60*24*30 {
		return errf(400, "bad_session", "Sessiya davomiyligi 5 daqiqadan 30 kungacha bo'lishi kerak (muddatsiz sessiya yo'q)")
	}
	switch in.Preset {
	case "once":
		in.MaxUses, in.MaxParallel = pi(1), pi(1)
	case "multi":
		if in.MaxUses == nil || *in.MaxUses < 2 {
			return errf(400, "bad_uses", "Foydalanish soni kamida 2 bo'lishi kerak")
		}
	case "timed":
		if in.StartsAt == nil || in.EndsAt == nil {
			return errf(400, "bad_window", "Boshlanish va tugash vaqtini kiriting")
		}
	case "custom":
	default:
		return errf(400, "bad_preset", "Havola turi noto'g'ri")
	}
	if in.MaxUses != nil && (*in.MaxUses < 1 || *in.MaxUses > 100000) {
		return errf(400, "bad_uses", "Foydalanish soni 1..100000")
	}
	if in.MaxParallel != nil && (*in.MaxParallel < 1 || *in.MaxParallel > 1000) {
		return errf(400, "bad_parallel", "Parallel sessiyalar 1..1000")
	}
	if in.MaxParallel == nil {
		return errf(400, "bad_parallel", "Parallel faol sessiyalar chegarasini kiriting")
	}
	if in.EndsAt != nil && in.StartsAt != nil && *in.EndsAt <= *in.StartsAt {
		return errf(400, "bad_window", "Tugash vaqti boshlanishdan keyin bo'lishi kerak")
	}
	if creating && in.EndsAt != nil && *in.EndsAt <= now {
		return errf(400, "bad_window", "Tugash vaqti kelajakda bo'lishi kerak")
	}
	if in.MaxUses == nil && in.EndsAt == nil {
		return errf(400, "unbounded", "Cheksiz havola yaratilmaydi: foydalanish soni yoki tugash vaqtini belgilang")
	}
	return nil
}

// CreateLink creates the link and its grants; returns the token once.
func (s *Service) CreateLink(ctx context.Context, a Actor, in LinkInput) (*Link, string, error) {
	now := s.nowMs()
	if err := in.normalize(now, true); err != nil {
		return nil, "", err
	}
	if len(in.Objects) == 0 {
		return nil, "", errf(400, "no_objects", "Kamida bitta kontent yoki to'plamni tanlang")
	}
	tok := secure.Token(24) // 192 bits
	var id int64
	err := s.St.Tx(ctx, func(tx *sql.Tx) error {
		if in.ForUserID != nil {
			var n int
			tx.QueryRowContext(ctx, `SELECT count(*) FROM users WHERE id=?`, *in.ForUserID).Scan(&n)
			if n == 0 {
				return errf(400, "bad_user", "Bog'langan hisob topilmadi")
			}
		}
		res, err := tx.ExecContext(ctx, `INSERT INTO access_links(name,preset,token_hash,token_enc,max_uses,max_parallel,starts_at,ends_at,session_minutes,for_user_id,note,created_by,created_at,updated_at)
		  VALUES(?,?,?,x'',?,?,?,?,?,?,?,?,?,?)`, in.Name, in.Preset, secure.Hash(tok), nullPtr(in.MaxUses), nullPtr(in.MaxParallel), nullPtr(in.StartsAt), nullPtr(in.EndsAt),
			in.SessionMinutes, nullPtr(in.ForUserID), in.Note, a.ID, now, now)
		if err != nil {
			return err
		}
		id, _ = res.LastInsertId()
		enc, err := secure.Seal(s.MasterKey, []byte(tok), []byte("link:"+itoa(id)))
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `UPDATE access_links SET token_enc=? WHERE id=?`, enc, id); err != nil {
			return err
		}
		if err := s.grantTx(ctx, tx, a, "link", id, in.Objects, nil); err != nil {
			return err
		}
		s.auditExec(ctx, tx, a, "link_create", "link:"+itoa(id), map[string]any{"preset": in.Preset, "maxUses": in.MaxUses, "maxParallel": in.MaxParallel, "endsAt": in.EndsAt, "objects": len(in.Objects)})
		return nil
	})
	if err != nil {
		return nil, "", err
	}
	l, err := s.GetLink(ctx, id)
	return l, tok, err
}

// UpdateLink changes name/limits/time (not the token). Tightened limits are
// enforced on live sessions immediately.
func (s *Service) UpdateLink(ctx context.Context, a Actor, id int64, in LinkInput) error {
	old, err := s.GetLink(ctx, id)
	if err != nil {
		return err
	}
	if old.RevokedAt != nil {
		return errf(409, "revoked", "Bekor qilingan havolani o'zgartirib bo'lmaydi")
	}
	in.Preset = old.Preset
	if in.Preset == "once" {
		in.Preset = "custom" // allow editing limits beyond the preset
		if in.MaxUses == nil {
			in.MaxUses = pi(1)
		}
	}
	if err := in.normalize(s.nowMs(), false); err != nil {
		return err
	}
	if _, err := s.St.DB.ExecContext(ctx, `UPDATE access_links SET name=?, max_uses=?, max_parallel=?, starts_at=?, ends_at=?, session_minutes=?, note=?, updated_at=? WHERE id=?`,
		in.Name, nullPtr(in.MaxUses), nullPtr(in.MaxParallel), nullPtr(in.StartsAt), nullPtr(in.EndsAt), in.SessionMinutes, in.Note, s.nowMs(), id); err != nil {
		return err
	}
	if in.EndsAt != nil { // sessions must not outlive the link window
		s.St.DB.ExecContext(ctx, `UPDATE web_sessions SET expires_at=MIN(expires_at, ?) WHERE link_id=? AND revoked_at IS NULL`, *in.EndsAt, id)
	}
	s.Audit(ctx, a, "link_update", "link:"+itoa(id), map[string]any{"maxUses": in.MaxUses, "maxParallel": in.MaxParallel, "endsAt": in.EndsAt})
	s.Enforcer.EnforceNow(ctx, "link_update")
	s.notifySubject(ctx, "link", id, "permissions")
	return nil
}

func (s *Service) linkSessionIDs(ctx context.Context, linkID int64) []int64 {
	return s.activeSessionIDs(ctx, "link_id=?", linkID)
}

// RevokeLink: DB first; then every session opened through it and all media
// (live and file transfers) are cut.
func (s *Service) RevokeLink(ctx context.Context, a Actor, id int64) error {
	now := s.nowMs()
	res, err := s.St.DB.ExecContext(ctx, `UPDATE access_links SET revoked_at=?, revoked_by=?, updated_at=? WHERE id=? AND revoked_at IS NULL`, now, a.ID, now, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	ids := s.linkSessionIDs(ctx, id)
	for _, sid := range ids {
		s.St.DB.ExecContext(ctx, `UPDATE web_sessions SET revoked_at=?, revoke_reason='link_revoked' WHERE id=? AND revoked_at IS NULL`, now, sid)
	}
	s.Audit(ctx, a, "link_revoke", "link:"+itoa(id), map[string]any{"sessions": len(ids)})
	s.Enforcer.EnforceNow(ctx, "link_revoke")
	for _, sid := range ids {
		s.Events.ToSession(sid, "logout", map[string]string{"reason": "link_revoked"})
		s.Events.CloseSession(sid)
	}
	s.Events.ToAdmins("sessions", nil)
	return nil
}

// RegenerateLink invalidates the old token and issues a new one. Existing
// sessions keep working unless endSessions is set.
func (s *Service) RegenerateLink(ctx context.Context, a Actor, id int64, endSessions bool) (string, error) {
	l, err := s.GetLink(ctx, id)
	if err != nil {
		return "", err
	}
	if l.RevokedAt != nil {
		return "", errf(409, "revoked", "Bekor qilingan havolani yangilab bo'lmaydi; yangisini yarating")
	}
	tok := secure.Token(24)
	enc, err := secure.Seal(s.MasterKey, []byte(tok), []byte("link:"+itoa(id)))
	if err != nil {
		return "", err
	}
	if _, err := s.St.DB.ExecContext(ctx, `UPDATE access_links SET token_hash=?, token_enc=?, token_version=token_version+1, updated_at=? WHERE id=?`, secure.Hash(tok), enc, s.nowMs(), id); err != nil {
		return "", err
	}
	// Pending retries of the old token must not mint new sessions.
	s.St.DB.ExecContext(ctx, `UPDATE link_activations SET created_at=0 WHERE link_id=?`, id)
	s.Audit(ctx, a, "link_regenerate", "link:"+itoa(id), map[string]any{"endSessions": endSessions, "version": l.TokenVersion + 1})
	if endSessions {
		now := s.nowMs()
		ids := s.linkSessionIDs(ctx, id)
		for _, sid := range ids {
			s.St.DB.ExecContext(ctx, `UPDATE web_sessions SET revoked_at=?, revoke_reason='link_revoked' WHERE id=? AND revoked_at IS NULL`, now, sid)
		}
		s.Enforcer.EnforceNow(ctx, "link_regenerate")
		for _, sid := range ids {
			s.Events.ToSession(sid, "logout", map[string]string{"reason": "link_revoked"})
			s.Events.CloseSession(sid)
		}
	}
	return tok, nil
}

type LinkPublicInfo struct {
	Status         string `json:"status"`
	Message        string `json:"message"`
	SessionMinutes int64  `json:"sessionMinutes"`
	EndsAt         *int64 `json:"endsAt"`
	StartsAt       *int64 `json:"startsAt"`
	SingleBrowser  bool   `json:"singleBrowser"`
}

// InspectLink tells the landing page whether the link can be used, without
// consuming anything. The recipient label is not revealed.
func (s *Service) InspectLink(ctx context.Context, tok string) (*LinkPublicInfo, error) {
	if !tokenShape(tok) {
		return nil, &Error{Status: 404, Code: "invalid_link", Msg: ReasonText("invalid_link")}
	}
	now := s.nowMs()
	l, err := scanLink(s.St.DB.QueryRowContext(ctx, `SELECT `+linkCols+` FROM access_links l WHERE l.token_hash=?`, now, secure.Hash(tok)), now)
	if err != nil {
		return nil, &Error{Status: 404, Code: "invalid_link", Msg: ReasonText("invalid_link")}
	}
	st := l.Status(now)
	msg := ""
	switch st {
	case "revoked":
		msg = ReasonText("link_revoked")
	case "expired":
		msg = ReasonText("link_expired")
	case "pending":
		msg = ReasonText("link_not_started")
	case "used_up":
		msg = ReasonText("link_used_up")
	}
	return &LinkPublicInfo{Status: st, Message: msg, SessionMinutes: l.SessionMinutes, EndsAt: l.EndsAt, StartsAt: l.StartsAt,
		SingleBrowser: l.MaxUses != nil && *l.MaxUses == 1}, nil
}

var tokenRe = regexp.MustCompile(`^[A-Za-z0-9_-]{20,100}$`)
var requestIDRe = regexp.MustCompile(`^[A-Za-z0-9_-]{16,64}$`)

func tokenShape(t string) bool { return tokenRe.MatchString(t) }

// retryWindow: a re-sent activation POST with the same request id within this
// window re-issues the session instead of consuming another use.
const retryWindow = 10 * time.Minute

// ActivateLink atomically checks the link and, in one BEGIN IMMEDIATE
// transaction, consumes one use and creates the browser session. Concurrent
// attempts are serialised by SQLite's single writer, so a one-time link
// yields exactly one session.
func (s *Service) ActivateLink(ctx context.Context, tok, requestID, ip, ua string) (string, *Session, bool, error) {
	if !tokenShape(tok) {
		return "", nil, false, &Error{Status: 404, Code: "invalid_link", Msg: ReasonText("invalid_link")}
	}
	if !requestIDRe.MatchString(requestID) {
		return "", nil, false, ErrBadRequest
	}
	sys, err := s.State(ctx)
	if err != nil {
		return "", nil, false, err
	}
	var cookie string
	var sess *Session
	var retried bool
	var denyCode string
	var linkID int64
	err = s.St.Tx(ctx, func(tx *sql.Tx) error {
		now := s.nowMs()
		l, err := scanLink(tx.QueryRowContext(ctx, `SELECT `+linkCols+` FROM access_links l WHERE l.token_hash=?`, now, secure.Hash(tok)), now)
		if err != nil {
			denyCode = "invalid_link"
			return nil
		}
		linkID = l.ID
		if sys.InstanceState != "active" {
			denyCode = "instance_" + sys.InstanceState
			return nil
		}
		if sys.EmergencyStop {
			denyCode = "emergency_stop"
			return nil
		}
		st := l.Status(now)
		if st == "revoked" || st == "expired" || st == "pending" {
			denyCode = map[string]string{"revoked": "link_revoked", "expired": "link_expired", "pending": "link_not_started"}[st]
			return nil
		}
		if l.ForUserID != nil {
			var us string
			tx.QueryRowContext(ctx, `SELECT status FROM users WHERE id=?`, *l.ForUserID).Scan(&us)
			if us == "blocked" {
				denyCode = "user_blocked"
				return nil
			}
		}
		expires := now + l.SessionMinutes*60_000
		if l.EndsAt != nil && *l.EndsAt < expires {
			expires = *l.EndsAt
		}
		// Idempotent retry of the same activation attempt.
		var actID, created int64
		var prevSess sql.NullInt64
		err = tx.QueryRowContext(ctx, `SELECT id, created_at, session_id FROM link_activations WHERE link_id=? AND request_id=?`, l.ID, requestID).Scan(&actID, &created, &prevSess)
		if err == nil {
			if now-created > retryWindow.Milliseconds() {
				denyCode = "link_used_up"
				return nil
			}
			if prevSess.Valid {
				tx.ExecContext(ctx, `UPDATE web_sessions SET revoked_at=?, revoke_reason='reissued' WHERE id=? AND revoked_at IS NULL`, now, prevSess.Int64)
			}
			cookie, sess, err = s.newSessionTx(ctx, tx, "link", 0, 0, l.ID, ip, ua, expires)
			if err != nil {
				return err
			}
			retried = true
			_, err = tx.ExecContext(ctx, `UPDATE link_activations SET session_id=? WHERE id=?`, sess.ID, actID)
			s.auditExec(ctx, tx, Actor{Type: "link", ID: l.ID, Name: l.Name, IP: ip}, "link_activate_retry", "link:"+itoa(l.ID), map[string]any{"session": sess.ID})
			return err
		} else if !isNoRows(err) {
			return err
		}
		if l.MaxUses != nil && l.UsesCount >= *l.MaxUses {
			denyCode = "link_used_up"
			return nil
		}
		if l.MaxParallel != nil && l.ActiveSessions >= *l.MaxParallel {
			denyCode = "link_parallel_limit"
			return nil
		}
		res, err := tx.ExecContext(ctx, `UPDATE access_links SET uses_count=uses_count+1 WHERE id=? AND (max_uses IS NULL OR uses_count < max_uses)`, l.ID)
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n != 1 {
			denyCode = "link_used_up"
			return nil
		}
		cookie, sess, err = s.newSessionTx(ctx, tx, "link", 0, 0, l.ID, ip, ua, expires)
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO link_activations(link_id,request_id,session_id,created_at,ip,user_agent) VALUES(?,?,?,?,?,?)`,
			l.ID, requestID, sess.ID, now, ip, cleanText(ua, 300, false)); err != nil {
			return err
		}
		s.auditExec(ctx, tx, Actor{Type: "link", ID: l.ID, Name: l.Name, IP: ip}, "link_activate", "link:"+itoa(l.ID), map[string]any{"session": sess.ID, "use": l.UsesCount + 1})
		sess.Role, sess.Name = "link", l.Name
		return nil
	})
	if err != nil {
		return "", nil, false, err
	}
	if denyCode != "" {
		a := Actor{Type: "anonymous", IP: ip}
		target := ""
		if linkID != 0 {
			target = "link:" + itoa(linkID)
		}
		s.AuditRateLimited(ctx, "la:"+ip+":"+denyCode+target, a, "link_activate_denied", target, map[string]any{"reason": denyCode})
		st := 403
		if denyCode == "invalid_link" {
			st = 404
		}
		return "", nil, false, &Error{Status: st, Code: denyCode, Msg: ReasonText(denyCode)}
	}
	if sess.Role == "" {
		l, _ := s.GetLink(ctx, linkID)
		sess.Role = "link"
		if l != nil {
			sess.Name = l.Name
		}
	}
	s.Events.ToAdmins("sessions", nil)
	s.Events.ToAdmins("links", nil)
	return cookie, sess, retried, nil
}
