package core

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"dronstream/internal/secure"
)

// Session is an authenticated browser session (user or guest).
type Session struct {
	ID          int64  `json:"id"`
	Kind        string `json:"kind"` // user | guest
	UserID      int64  `json:"userId,omitempty"`
	GuestID     int64  `json:"guestId,omitempty"`
	CSRF        string `json:"-"`
	CreatedAt   int64  `json:"createdAt"`
	LastSeen    int64  `json:"lastSeen"`
	ExpiresAt   int64  `json:"expiresAt"`
	IP          string `json:"ip"`
	UserAgent   string `json:"userAgent"`
	Role        string `json:"role"` // admin | user | guest
	Name        string `json:"name"`
	Username    string `json:"username,omitempty"`
	GuestStatus string `json:"guestStatus,omitempty"`
	MustChange  bool   `json:"mustChangePassword,omitempty"`
}

func (s *Session) Actor(ip string) Actor {
	t := s.Role
	id := s.UserID
	if s.Kind == "guest" {
		id = s.GuestID
	}
	return Actor{Type: t, ID: id, Name: s.Name, IP: ip}
}

func (s *Session) IsAdmin() bool { return s.Kind == "user" && s.Role == "admin" }

func (s *Service) SetupNeeded(ctx context.Context) (bool, error) {
	var n int
	err := s.St.DB.QueryRowContext(ctx, `SELECT count(*) FROM users WHERE role='admin'`).Scan(&n)
	return n == 0, err
}

// CreateUser creates a user. For the very first admin, a = System.
func (s *Service) CreateUser(ctx context.Context, a Actor, username, display, password, role string, mustChange bool) (int64, error) {
	username = strings.TrimSpace(username)
	if !validUsername(username) {
		return 0, errf(400, "bad_username", "Login 3–40 belgi: lotin harflari, raqamlar, . _ -")
	}
	if role != "admin" && role != "user" {
		return 0, errf(400, "bad_role", "Rol admin yoki user bo'lishi kerak")
	}
	if m := secure.PasswordPolicy(password); m != "" {
		return 0, errf(400, "weak_password", m)
	}
	display = cleanText(display, 80, false)
	if display == "" {
		display = username
	}
	h, err := secure.HashPassword(password)
	if err != nil {
		return 0, err
	}
	now := s.nowMs()
	res, err := s.St.DB.ExecContext(ctx, `INSERT INTO users(username,display_name,password_hash,role,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`,
		username, display, h, role, mustChange, now, now)
	if err != nil {
		if isUniqueErr(err) {
			return 0, errf(409, "exists", "Bunday login mavjud")
		}
		return 0, err
	}
	id, _ := res.LastInsertId()
	s.Audit(ctx, a, "user_create", "user:"+username, map[string]any{"role": role})
	return id, nil
}

// SetupFirstAdmin creates the first administrator using the one-time setup
// token. Fails if an admin already exists (atomic check inside one tx).
func (s *Service) SetupFirstAdmin(ctx context.Context, username, display, password, ip string) (int64, error) {
	var id int64
	err := s.St.Tx(ctx, func(tx *sql.Tx) error {
		var n int
		if err := tx.QueryRowContext(ctx, `SELECT count(*) FROM users WHERE role='admin'`).Scan(&n); err != nil {
			return err
		}
		if n > 0 {
			return errf(409, "setup_done", "Administrator allaqachon yaratilgan")
		}
		if !validUsername(username) {
			return errf(400, "bad_username", "Login 3–40 belgi: lotin harflari, raqamlar, . _ -")
		}
		if m := secure.PasswordPolicy(password); m != "" {
			return errf(400, "weak_password", m)
		}
		h, err := secure.HashPassword(password)
		if err != nil {
			return err
		}
		display = cleanText(display, 80, false)
		if display == "" {
			display = username
		}
		now := s.nowMs()
		res, err := tx.ExecContext(ctx, `INSERT INTO users(username,display_name,password_hash,role,created_at,updated_at) VALUES(?,?,?,'admin',?,?)`, username, display, h, now, now)
		if err != nil {
			return err
		}
		id, _ = res.LastInsertId()
		s.auditExec(ctx, tx, Actor{Type: "system", Name: "setup", IP: ip}, "admin_setup", "user:"+username, nil)
		return nil
	})
	return id, err
}

const (
	maxFailedLogins = 5
	lockDuration    = 5 * time.Minute
)

var errBadLogin = errf(401, "bad_login", "Login yoki parol noto'g'ri")

// Login verifies credentials and creates a session. Returns the raw cookie token.
func (s *Service) Login(ctx context.Context, username, password, ip, ua string) (string, *Session, error) {
	var (
		id                   int64
		hash, role, status   string
		display, uname       string
		failed               int
		lockedUntil          int64
		mustChange           bool
	)
	err := s.St.DB.QueryRowContext(ctx, `SELECT id,username,display_name,password_hash,role,status,failed_logins,locked_until,must_change_password FROM users WHERE username=?`, strings.TrimSpace(username)).
		Scan(&id, &uname, &display, &hash, &role, &status, &failed, &lockedUntil, &mustChange)
	now := s.nowMs()
	anon := Actor{Type: "anonymous", Name: cleanText(username, 40, false), IP: ip}
	if isNoRows(err) {
		secure.BurnPasswordTime(password)
		s.Audit(ctx, anon, "login_failed", "", map[string]any{"reason": "unknown_user"})
		return "", nil, errBadLogin
	}
	if err != nil {
		return "", nil, err
	}
	if lockedUntil > now {
		secure.BurnPasswordTime(password)
		s.Audit(ctx, anon, "login_failed", "user:"+uname, map[string]any{"reason": "locked"})
		return "", nil, errf(429, "locked", "Ko'p noto'g'ri urinish. Birozdan so'ng qayta urining")
	}
	if !secure.VerifyPassword(hash, password) {
		failed++
		lock := int64(0)
		if failed >= maxFailedLogins {
			lock = now + lockDuration.Milliseconds()
			failed = 0
		}
		s.St.DB.ExecContext(ctx, `UPDATE users SET failed_logins=?, locked_until=? WHERE id=?`, failed, lock, id)
		s.Audit(ctx, anon, "login_failed", "user:"+uname, map[string]any{"reason": "bad_password"})
		return "", nil, errBadLogin
	}
	if status != "active" {
		s.Audit(ctx, anon, "login_failed", "user:"+uname, map[string]any{"reason": "blocked"})
		return "", nil, errf(403, "blocked", "Hisob bloklangan. Administratorga murojaat qiling")
	}
	s.St.DB.ExecContext(ctx, `UPDATE users SET failed_logins=0, locked_until=0 WHERE id=?`, id)
	tok, sess, err := s.newSession(ctx, "user", id, 0, ip, ua, now+int64(s.Cfg.Security.SessionHours)*3600_000)
	if err != nil {
		return "", nil, err
	}
	sess.Role, sess.Name, sess.Username, sess.MustChange = role, display, uname, mustChange
	s.Audit(ctx, Actor{Type: role, ID: id, Name: display, IP: ip}, "login", "user:"+uname, map[string]any{"session": sess.ID})
	s.Events.ToAdmins("sessions", nil)
	return tok, sess, nil
}

func (s *Service) newSession(ctx context.Context, kind string, userID, guestID int64, ip, ua string, expires int64) (string, *Session, error) {
	tok := secure.Token(32)
	csrf := secure.Token(24)
	now := s.nowMs()
	var uid, gid any
	if userID != 0 {
		uid = userID
	}
	if guestID != 0 {
		gid = guestID
	}
	ua = cleanText(ua, 300, false)
	res, err := s.St.DB.ExecContext(ctx, `INSERT INTO web_sessions(token_hash,kind,user_id,guest_id,csrf_token,created_at,last_seen_at,expires_at,ip,user_agent) VALUES(?,?,?,?,?,?,?,?,?,?)`,
		secure.Hash(tok), kind, uid, gid, csrf, now, now, expires, ip, ua)
	if err != nil {
		return "", nil, err
	}
	id, _ := res.LastInsertId()
	return tok, &Session{ID: id, Kind: kind, UserID: userID, GuestID: guestID, CSRF: csrf, CreatedAt: now, LastSeen: now, ExpiresAt: expires, IP: ip, UserAgent: ua}, nil
}

const sessionSelect = `SELECT ws.id, ws.kind, COALESCE(ws.user_id,0), COALESCE(ws.guest_id,0), ws.csrf_token, ws.created_at, ws.last_seen_at, ws.expires_at, ws.ip, ws.user_agent, ws.revoked_at,
 COALESCE(u.role,''), COALESCE(u.status,''), COALESCE(u.display_name,''), COALESCE(u.username,''), COALESCE(u.must_change_password,0),
 COALESCE(g.display_name,''), COALESCE(g.status,''), g.access_until
 FROM web_sessions ws LEFT JOIN users u ON u.id=ws.user_id LEFT JOIN guests g ON g.id=ws.guest_id`

func (s *Service) scanSession(row interface{ Scan(...any) error }) (*Session, sql.NullInt64, string, sql.NullInt64, error) {
	var x Session
	var revoked, guestUntil sql.NullInt64
	var userStatus string
	var gName string
	err := row.Scan(&x.ID, &x.Kind, &x.UserID, &x.GuestID, &x.CSRF, &x.CreatedAt, &x.LastSeen, &x.ExpiresAt, &x.IP, &x.UserAgent, &revoked,
		&x.Role, &userStatus, &x.Name, &x.Username, &x.MustChange, &gName, &x.GuestStatus, &guestUntil)
	if err != nil {
		return nil, revoked, "", guestUntil, err
	}
	if x.Kind == "guest" {
		x.Role = "guest"
		x.Name = gName
	}
	return &x, revoked, userStatus, guestUntil, nil
}

// SessionByToken validates a cookie token. Returns ErrUnauthorized for
// unknown, revoked, expired, idle-timed-out or blocked sessions.
func (s *Service) SessionByToken(ctx context.Context, tok string) (*Session, error) {
	if tok == "" || len(tok) > 200 {
		return nil, ErrUnauthorized
	}
	row := s.St.DB.QueryRowContext(ctx, sessionSelect+` WHERE ws.token_hash=?`, secure.Hash(tok))
	sess, revoked, userStatus, _, err := s.scanSession(row)
	if isNoRows(err) {
		return nil, ErrUnauthorized
	}
	if err != nil {
		return nil, err
	}
	now := s.nowMs()
	if revoked.Valid || sess.ExpiresAt < now {
		return nil, ErrUnauthorized
	}
	if sess.Kind == "user" {
		if userStatus != "active" {
			return nil, ErrUnauthorized
		}
		if idle := int64(s.Cfg.Security.IdleMinutes) * 60_000; idle > 0 && now-sess.LastSeen > idle {
			s.revokeSessionIDs(ctx, []int64{sess.ID}, "idle_timeout")
			return nil, ErrUnauthorized
		}
	} else if sess.GuestStatus == "rejected" || sess.GuestStatus == "ended" {
		// Keep the session readable so the guest sees the outcome, but it
		// never authorises media (authorizeView checks status 'approved').
	}
	s.touch(ctx, sess.ID, now)
	return sess, nil
}

// Touch updates last_seen at most every 20 s per session.
func (s *Service) touch(ctx context.Context, id, now int64) {
	s.touchMu.Lock()
	last := s.lastTouch[id]
	if now-last < 20_000 {
		s.touchMu.Unlock()
		return
	}
	s.lastTouch[id] = now
	s.touchMu.Unlock()
	s.St.DB.ExecContext(ctx, `UPDATE web_sessions SET last_seen_at=? WHERE id=?`, now, id)
}

func (s *Service) Touch(ctx context.Context, id int64) { s.touch(ctx, id, s.nowMs()) }

func (s *Service) Logout(ctx context.Context, sess *Session, ip string) {
	s.revokeSessionIDs(ctx, []int64{sess.ID}, "logout")
	s.Audit(ctx, sess.Actor(ip), "logout", "", map[string]any{"session": sess.ID})
	s.Enforcer.EnforceNow(ctx, "logout")
	s.Events.ToAdmins("sessions", nil)
}

func (s *Service) revokeSessionIDs(ctx context.Context, ids []int64, reason string) {
	now := s.nowMs()
	for _, id := range ids {
		s.St.DB.ExecContext(ctx, `UPDATE web_sessions SET revoked_at=?, revoke_reason=? WHERE id=? AND revoked_at IS NULL`, now, reason, id)
	}
}

func (s *Service) activeSessionIDs(ctx context.Context, where string, arg any) []int64 {
	rows, err := s.St.DB.QueryContext(ctx, `SELECT id FROM web_sessions WHERE revoked_at IS NULL AND `+where, arg)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		rows.Scan(&id)
		ids = append(ids, id)
	}
	return ids
}

// RevokeSession ends one browser session (admin action).
func (s *Service) RevokeSession(ctx context.Context, a Actor, sessionID int64) error {
	res, err := s.St.DB.ExecContext(ctx, `UPDATE web_sessions SET revoked_at=?, revoke_reason='admin' WHERE id=? AND revoked_at IS NULL`, s.nowMs(), sessionID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	s.Audit(ctx, a, "session_revoke", "session:"+itoa(sessionID), nil)
	s.Enforcer.EnforceNow(ctx, "session_revoke")
	s.Events.ToSession(sessionID, "logout", map[string]string{"reason": "session_ended"})
	s.Events.CloseSession(sessionID)
	s.Events.ToAdmins("sessions", nil)
	return nil
}

// LogoutEverywhere revokes all sessions of a user.
func (s *Service) LogoutEverywhere(ctx context.Context, a Actor, userID int64, reason string) error {
	ids := s.activeSessionIDs(ctx, "user_id=?", userID)
	s.revokeSessionIDs(ctx, ids, reason)
	s.Audit(ctx, a, "user_logout_all", "user:"+itoa(userID), map[string]any{"sessions": len(ids), "reason": reason})
	s.Enforcer.EnforceNow(ctx, "logout_all")
	for _, id := range ids {
		s.Events.ToSession(id, "logout", map[string]string{"reason": reason})
		s.Events.CloseSession(id)
	}
	s.Events.ToAdmins("sessions", nil)
	return nil
}

func (s *Service) SetUserBlocked(ctx context.Context, a Actor, userID int64, blocked bool) error {
	if a.ID == userID && a.Type == "admin" && blocked {
		return errf(400, "self", "O'zingizni bloklay olmaysiz")
	}
	st := "active"
	if blocked {
		st = "blocked"
	}
	res, err := s.St.DB.ExecContext(ctx, `UPDATE users SET status=?, updated_at=? WHERE id=?`, st, s.nowMs(), userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	s.Audit(ctx, a, map[bool]string{true: "user_block", false: "user_unblock"}[blocked], "user:"+itoa(userID), nil)
	if blocked {
		return s.LogoutEverywhere(ctx, a, userID, "user_blocked")
	}
	return nil
}

func (s *Service) ResetPassword(ctx context.Context, a Actor, userID int64, newPw string) error {
	if m := secure.PasswordPolicy(newPw); m != "" {
		return errf(400, "weak_password", m)
	}
	h, err := secure.HashPassword(newPw)
	if err != nil {
		return err
	}
	res, err := s.St.DB.ExecContext(ctx, `UPDATE users SET password_hash=?, must_change_password=1, failed_logins=0, locked_until=0, updated_at=? WHERE id=?`, h, s.nowMs(), userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	s.Audit(ctx, a, "password_reset", "user:"+itoa(userID), nil)
	return s.LogoutEverywhere(ctx, a, userID, "password_reset")
}

func (s *Service) ChangeOwnPassword(ctx context.Context, sess *Session, oldPw, newPw, ip string) error {
	if sess.Kind != "user" {
		return ErrForbidden
	}
	var hash string
	if err := s.St.DB.QueryRowContext(ctx, `SELECT password_hash FROM users WHERE id=?`, sess.UserID).Scan(&hash); err != nil {
		return err
	}
	if !secure.VerifyPassword(hash, oldPw) {
		return errf(400, "bad_password", "Joriy parol noto'g'ri")
	}
	if m := secure.PasswordPolicy(newPw); m != "" {
		return errf(400, "weak_password", m)
	}
	h, err := secure.HashPassword(newPw)
	if err != nil {
		return err
	}
	if _, err := s.St.DB.ExecContext(ctx, `UPDATE users SET password_hash=?, must_change_password=0, updated_at=? WHERE id=?`, h, s.nowMs(), sess.UserID); err != nil {
		return err
	}
	// Other sessions of this user are ended; the current one stays.
	ids := s.activeSessionIDs(ctx, "user_id=?", sess.UserID)
	var others []int64
	for _, id := range ids {
		if id != sess.ID {
			others = append(others, id)
		}
	}
	s.revokeSessionIDs(ctx, others, "password_changed")
	s.Audit(ctx, sess.Actor(ip), "password_change", "user:"+itoa(sess.UserID), nil)
	s.Enforcer.EnforceNow(ctx, "password_change")
	return nil
}

func (s *Service) UpdateUser(ctx context.Context, a Actor, userID int64, display, role string) error {
	if role != "admin" && role != "user" {
		return ErrBadRequest
	}
	if a.ID == userID && role != "admin" {
		return errf(400, "self", "O'zingizning admin rolingizni olib tashlay olmaysiz")
	}
	display = cleanText(display, 80, false)
	res, err := s.St.DB.ExecContext(ctx, `UPDATE users SET display_name=COALESCE(NULLIF(?,''),display_name), role=?, updated_at=? WHERE id=?`, display, role, s.nowMs(), userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	s.Audit(ctx, a, "user_update", "user:"+itoa(userID), map[string]any{"role": role})
	s.Enforcer.EnforceNow(ctx, "user_update")
	return nil
}

type UserInfo struct {
	ID          int64  `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
	Status      string `json:"status"`
	MustChange  bool   `json:"mustChangePassword"`
	CreatedAt   int64  `json:"createdAt"`
	LockedUntil int64  `json:"lockedUntil"`
}

func (s *Service) ListUsers(ctx context.Context) ([]UserInfo, error) {
	rows, err := s.St.DB.QueryContext(ctx, `SELECT id,username,display_name,role,status,must_change_password,created_at,locked_until FROM users ORDER BY username`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []UserInfo{}
	for rows.Next() {
		var u UserInfo
		if err := rows.Scan(&u.ID, &u.Username, &u.DisplayName, &u.Role, &u.Status, &u.MustChange, &u.CreatedAt, &u.LockedUntil); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func isUniqueErr(err error) bool { return err != nil && strings.Contains(err.Error(), "UNIQUE") }
