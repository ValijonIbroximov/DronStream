package core

import (
	"context"
	"database/sql"
)

type GuestInfo struct {
	ID          int64  `json:"id"`
	DisplayName string `json:"displayName"`
	Reason      string `json:"reason"`
	Status      string `json:"status"`
	CreatedAt   int64  `json:"createdAt"`
	DecidedAt   *int64 `json:"decidedAt"`
	DecidedBy   string `json:"decidedBy"`
	Note        string `json:"note"`
	AccessUntil *int64 `json:"accessUntil"`
	IP          string `json:"ip"`
	UserAgent   string `json:"userAgent"`
	SessionID   int64  `json:"sessionId"`
	Online      bool   `json:"online"`
}

// CreateGuestRequest creates an unverified guest identity bound to a brand
// new browser session. The name is free text and NOT a verified identity.
func (s *Service) CreateGuestRequest(ctx context.Context, name, reason, ip, ua string) (string, *Session, error) {
	st, err := s.State(ctx)
	if err != nil {
		return "", nil, err
	}
	if !st.GuestEnabled || st.InstanceState != "active" {
		return "", nil, errf(403, "guest_disabled", "Mehmon sifatida kirish hozircha yopiq")
	}
	name = cleanText(name, 60, false)
	reason = cleanText(reason, 1000, true)
	if len([]rune(name)) < 2 {
		return "", nil, errf(400, "bad_name", "Ismingizni kiriting (kamida 2 belgi)")
	}
	if len([]rune(reason)) < 3 {
		return "", nil, errf(400, "bad_reason", "Kimligingiz va kirish sababini yozing")
	}
	var pending int
	if err := s.St.DB.QueryRowContext(ctx, `SELECT count(*) FROM guests WHERE status='pending'`).Scan(&pending); err != nil {
		return "", nil, err
	}
	if pending >= s.Cfg.Security.MaxPendingGuests {
		return "", nil, errf(429, "too_many", "Hozir so'rovlar juda ko'p. Keyinroq urinib ko'ring")
	}
	now := s.nowMs()
	res, err := s.St.DB.ExecContext(ctx, `INSERT INTO guests(display_name,reason,status,created_at,ip,user_agent) VALUES(?,?, 'pending', ?,?,?)`, name, reason, now, ip, cleanText(ua, 300, false))
	if err != nil {
		return "", nil, err
	}
	gid, _ := res.LastInsertId()
	tok, sess, err := s.newSession(ctx, "guest", 0, gid, ip, ua, now+int64(s.Cfg.Security.GuestMaxHours)*3600_000)
	if err != nil {
		return "", nil, err
	}
	sess.Role, sess.Name, sess.GuestStatus = "guest", name, "pending"
	s.Audit(ctx, Actor{Type: "guest", ID: gid, Name: name, IP: ip}, "guest_request", "guest:"+itoa(gid), map[string]any{"session": sess.ID})
	s.Events.ToAdmins("guest_request", map[string]any{"id": gid, "name": name})
	return tok, sess, nil
}

// ApproveGuest grants the guest access to the given streams until `until`
// (unix ms; 0 = default duration). Previous grants are replaced.
func (s *Service) ApproveGuest(ctx context.Context, a Actor, guestID int64, streamIDs []int64, until int64, note string) error {
	objs, err := s.streamContentIDs(ctx, streamIDs)
	if err != nil {
		return err
	}
	return s.ApproveGuestObjects(ctx, a, guestID, objs, until, note)
}

// ApproveGuestObjects approves a guest for contents/collections until `until`.
func (s *Service) ApproveGuestObjects(ctx context.Context, a Actor, guestID int64, objs []GrantObject, until int64, note string) error {
	if len(objs) == 0 {
		return errf(400, "no_streams", "Kamida bitta kontent yoki to'plamni tanlang")
	}
	now := s.nowMs()
	if until == 0 {
		st, _ := s.State(ctx)
		until = now + int64(st.GuestMinutes)*60_000
	}
	if until <= now {
		return errf(400, "bad_until", "Tugash vaqti kelajakda bo'lishi kerak")
	}
	maxUntil := now + int64(s.Cfg.Security.GuestMaxHours)*3600_000*30
	if until > maxUntil {
		until = maxUntil
	}
	err := s.St.Tx(ctx, func(tx *sql.Tx) error {
		var status string
		if err := tx.QueryRowContext(ctx, `SELECT status FROM guests WHERE id=?`, guestID).Scan(&status); err != nil {
			if isNoRows(err) {
				return ErrNotFound
			}
			return err
		}
		if status == "ended" {
			return errf(409, "ended", "Bu mehmon sessiyasi yakunlangan; u qaytadan so'rov yuborishi kerak")
		}
		if _, err := tx.ExecContext(ctx, `UPDATE guests SET status='approved', decided_at=?, decided_by=?, decision_note=?, access_until=? WHERE id=?`, now, a.ID, cleanText(note, 300, false), until, guestID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `UPDATE grants SET revoked_at=?, revoked_by=? WHERE subject_type='guest' AND subject_id=? AND revoked_at IS NULL`, now, a.ID, guestID); err != nil {
			return err
		}
		if err := s.grantTx(ctx, tx, a, "guest", guestID, objs, &until); err != nil {
			return err
		}
		// Guest browser session lives until the access ends.
		if _, err := tx.ExecContext(ctx, `UPDATE web_sessions SET expires_at=? WHERE guest_id=? AND revoked_at IS NULL`, until+5*60_000, guestID); err != nil {
			return err
		}
		s.auditExec(ctx, tx, a, "guest_approve", "guest:"+itoa(guestID), map[string]any{"objects": objs, "until": until})
		return nil
	})
	if err != nil {
		return err
	}
	s.Enforcer.EnforceNow(ctx, "guest_approve") // a re-approval with fewer streams must cut the rest
	s.notifyGuest(ctx, guestID, "guest_status")
	s.Events.ToAdmins("guests", nil)
	return nil
}

func (s *Service) RejectGuest(ctx context.Context, a Actor, guestID int64, note string) error {
	now := s.nowMs()
	res, err := s.St.DB.ExecContext(ctx, `UPDATE guests SET status='rejected', decided_at=?, decided_by=?, decision_note=? WHERE id=? AND status IN ('pending','approved')`, now, a.ID, cleanText(note, 300, false), guestID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	s.St.DB.ExecContext(ctx, `UPDATE grants SET revoked_at=?, revoked_by=? WHERE subject_type='guest' AND subject_id=? AND revoked_at IS NULL`, now, a.ID, guestID)
	s.Audit(ctx, a, "guest_reject", "guest:"+itoa(guestID), nil)
	s.Enforcer.EnforceNow(ctx, "guest_reject")
	s.notifyGuest(ctx, guestID, "guest_status")
	s.Events.ToAdmins("guests", nil)
	return nil
}

// EndGuest terminates a guest: status ended, permissions revoked, session revoked.
func (s *Service) EndGuest(ctx context.Context, a Actor, guestID int64) error {
	now := s.nowMs()
	var ids []int64
	err := s.St.Tx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `UPDATE guests SET status='ended', decided_at=COALESCE(decided_at,?) WHERE id=? AND status!='ended'`, now, guestID)
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrNotFound
		}
		if _, err := tx.ExecContext(ctx, `UPDATE grants SET revoked_at=?, revoked_by=? WHERE subject_type='guest' AND subject_id=? AND revoked_at IS NULL`, now, a.ID, guestID); err != nil {
			return err
		}
		rows, err := tx.QueryContext(ctx, `SELECT id FROM web_sessions WHERE guest_id=? AND revoked_at IS NULL`, guestID)
		if err != nil {
			return err
		}
		for rows.Next() {
			var id int64
			rows.Scan(&id)
			ids = append(ids, id)
		}
		rows.Close()
		if _, err := tx.ExecContext(ctx, `UPDATE web_sessions SET revoked_at=?, revoke_reason='guest_ended' WHERE guest_id=? AND revoked_at IS NULL`, now, guestID); err != nil {
			return err
		}
		s.auditExec(ctx, tx, a, "guest_end", "guest:"+itoa(guestID), nil)
		return nil
	})
	if err != nil {
		return err
	}
	s.Enforcer.EnforceNow(ctx, "guest_end")
	for _, id := range ids {
		s.Events.ToSession(id, "logout", map[string]string{"reason": "guest_ended"})
		s.Events.CloseSession(id)
	}
	s.Events.ToAdmins("guests", nil)
	return nil
}

func (s *Service) notifyGuest(ctx context.Context, guestID int64, kind string) {
	for _, id := range s.activeSessionIDs(ctx, "guest_id=?", guestID) {
		s.Events.ToSession(id, kind, nil)
	}
}

func (s *Service) ListGuests(ctx context.Context, status string) ([]GuestInfo, error) {
	q := `SELECT g.id,g.display_name,g.reason,g.status,g.created_at,g.decided_at,COALESCE(u.display_name,''),g.decision_note,g.access_until,g.ip,g.user_agent,
	 COALESCE((SELECT max(id) FROM web_sessions WHERE guest_id=g.id),0)
	 FROM guests g LEFT JOIN users u ON u.id=g.decided_by`
	args := []any{}
	if status != "" {
		q += ` WHERE g.status=?`
		args = append(args, status)
	}
	q += ` ORDER BY g.created_at DESC LIMIT 500`
	rows, err := s.St.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []GuestInfo{}
	for rows.Next() {
		var g GuestInfo
		var dec, until sql.NullInt64
		if err := rows.Scan(&g.ID, &g.DisplayName, &g.Reason, &g.Status, &g.CreatedAt, &dec, &g.DecidedBy, &g.Note, &until, &g.IP, &g.UserAgent, &g.SessionID); err != nil {
			return nil, err
		}
		g.DecidedAt, g.AccessUntil = nullable(dec), nullable(until)
		out = append(out, g)
	}
	return out, rows.Err()
}

func streamExists(ctx context.Context, tx *sql.Tx, id int64) error {
	var x int64
	if err := tx.QueryRowContext(ctx, `SELECT id FROM streams WHERE id=?`, id).Scan(&x); err != nil {
		if isNoRows(err) {
			return errf(400, "bad_stream", "Stream topilmadi")
		}
		return err
	}
	return nil
}
