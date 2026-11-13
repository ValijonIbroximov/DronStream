package core

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"dronstream/internal/secure"
)

type Stream struct {
	ID             int64  `json:"id"`
	Name           string `json:"name"`
	Slug           string `json:"slug"`
	Description    string `json:"description"`
	PublishMode    string `json:"publishMode"`
	HasKey         bool   `json:"hasKey"`
	KeyVersion     int64  `json:"keyVersion"`
	KeySetAt       *int64 `json:"keySetAt"`
	PublishEnabled bool   `json:"publishEnabled"`
	ViewingEnabled bool   `json:"viewingEnabled"`
	IsDemo         bool   `json:"isDemo"`
	CreatedAt      int64  `json:"createdAt"`
	keyHash        []byte
	keyEnc         []byte
}

const streamCols = `id,name,slug,description,publish_mode,key_hash,key_enc,key_version,key_set_at,publish_enabled,viewing_enabled,is_demo,created_at`

func scanStream(row interface{ Scan(...any) error }) (*Stream, error) {
	var st Stream
	var setAt sql.NullInt64
	if err := row.Scan(&st.ID, &st.Name, &st.Slug, &st.Description, &st.PublishMode, &st.keyHash, &st.keyEnc, &st.KeyVersion, &setAt, &st.PublishEnabled, &st.ViewingEnabled, &st.IsDemo, &st.CreatedAt); err != nil {
		return nil, err
	}
	st.KeySetAt = nullable(setAt)
	st.HasKey = len(st.keyHash) > 0
	return &st, nil
}

// MediaPath is the internal MediaMTX path. In "path" mode it contains the
// key, therefore it is never sent to non-admin clients and is masked in logs.
func (s *Service) MediaPath(st *Stream) (string, error) {
	if st.PublishMode == "path" {
		k, err := s.streamKey(st)
		if err != nil || k == "" {
			return "", fmt.Errorf("stream %d has no key", st.ID)
		}
		return "live/" + st.Slug + "/" + k, nil
	}
	return "live/" + st.Slug, nil
}

func (s *Service) streamKey(st *Stream) (string, error) {
	if len(st.keyEnc) == 0 {
		return "", nil
	}
	b, err := secure.Open(s.MasterKey, st.keyEnc, []byte("stream:"+itoa(st.ID)))
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (s *Service) GetStream(ctx context.Context, id int64) (*Stream, error) {
	st, err := scanStream(s.St.DB.QueryRowContext(ctx, `SELECT `+streamCols+` FROM streams WHERE id=?`, id))
	if isNoRows(err) {
		return nil, ErrNotFound
	}
	return st, err
}

func (s *Service) StreamBySlug(ctx context.Context, slug string) (*Stream, error) {
	st, err := scanStream(s.St.DB.QueryRowContext(ctx, `SELECT `+streamCols+` FROM streams WHERE slug=?`, slug))
	if isNoRows(err) {
		return nil, ErrNotFound
	}
	return st, err
}

func (s *Service) ListStreams(ctx context.Context) ([]*Stream, error) {
	rows, err := s.St.DB.QueryContext(ctx, `SELECT `+streamCols+` FROM streams ORDER BY is_demo, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Stream{}
	for rows.Next() {
		st, err := scanStream(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, st)
	}
	return out, rows.Err()
}

type StreamInput struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	PublishMode string `json:"publishMode"`
}

func (s *Service) CreateStream(ctx context.Context, a Actor, in StreamInput, demo bool) (*Stream, string, error) {
	in.Name = cleanText(in.Name, 80, false)
	in.Slug = strings.ToLower(strings.TrimSpace(in.Slug))
	in.Description = cleanText(in.Description, 500, true)
	if in.PublishMode == "" {
		in.PublishMode = "query"
	}
	if in.Name == "" {
		return nil, "", errf(400, "bad_name", "Nomini kiriting")
	}
	if !validSlug(in.Slug) {
		return nil, "", errf(400, "bad_slug", "Yo'l nomi 2–40 belgi: kichik lotin harflari, raqamlar, - _")
	}
	if in.PublishMode != "query" && in.PublishMode != "path" {
		return nil, "", ErrBadRequest
	}
	now := s.nowMs()
	var id int64
	key := secure.KeyToken(32)
	err := s.St.Tx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `INSERT INTO streams(name,slug,description,publish_mode,is_demo,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`, in.Name, in.Slug, in.Description, in.PublishMode, demo, now, now)
		if err != nil {
			if isUniqueErr(err) {
				return errf(409, "exists", "Bunday yo'l nomi band")
			}
			return err
		}
		id, _ = res.LastInsertId()
		if err := s.setKeyTx(ctx, tx, id, key); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO contents(type,title,description,stream_id,sort_order,created_at,updated_at) VALUES('stream',?,?,?,(SELECT COALESCE(MAX(sort_order),0)+10 FROM contents),?,?)`, in.Name, in.Description, id, now, now); err != nil {
			return err
		}
		s.auditExec(ctx, tx, a, "stream_create", "stream:"+in.Slug, map[string]any{"demo": demo, "mode": in.PublishMode})
		return nil
	})
	if err != nil {
		return nil, "", err
	}
	st, err := s.GetStream(ctx, id)
	return st, key, err
}

func (s *Service) setKeyTx(ctx context.Context, tx *sql.Tx, id int64, key string) error {
	var hash, enc any
	if key != "" {
		e, err := secure.Seal(s.MasterKey, []byte(key), []byte("stream:"+itoa(id)))
		if err != nil {
			return err
		}
		hash, enc = secure.Hash(key), e
	}
	_, err := tx.ExecContext(ctx, `UPDATE streams SET key_hash=?, key_enc=?, key_version=key_version+1, key_set_at=?, updated_at=? WHERE id=?`, hash, enc, s.nowMs(), s.nowMs(), id)
	return err
}

func (s *Service) UpdateStream(ctx context.Context, a Actor, id int64, in StreamInput) error {
	in.Name = cleanText(in.Name, 80, false)
	in.Description = cleanText(in.Description, 500, true)
	if in.Name == "" {
		return errf(400, "bad_name", "Nomini kiriting")
	}
	old, err := s.GetStream(ctx, id)
	if err != nil {
		return err
	}
	mode := in.PublishMode
	if mode == "" {
		mode = old.PublishMode
	}
	if mode != "query" && mode != "path" {
		return ErrBadRequest
	}
	if _, err := s.St.DB.ExecContext(ctx, `UPDATE streams SET name=?, description=?, publish_mode=?, updated_at=? WHERE id=?`, in.Name, in.Description, mode, s.nowMs(), id); err != nil {
		return err
	}
	s.Audit(ctx, a, "stream_update", "stream:"+old.Slug, map[string]any{"mode": mode})
	if mode != old.PublishMode {
		// Media path changes: the current publisher and viewers must reconnect.
		s.Enforcer.KickPublisher(ctx, id, "publish_mode_changed")
		s.Enforcer.EnforceNow(ctx, "stream_mode")
	}
	return nil
}

// RotateKey issues a new publish key (old one stops working immediately and
// the current publisher is disconnected). Returns the new key once.
func (s *Service) RotateKey(ctx context.Context, a Actor, id int64) (string, error) {
	st, err := s.GetStream(ctx, id)
	if err != nil {
		return "", err
	}
	key := secure.KeyToken(32)
	if err := s.St.Tx(ctx, func(tx *sql.Tx) error {
		if err := s.setKeyTx(ctx, tx, id, key); err != nil {
			return err
		}
		s.auditExec(ctx, tx, a, "stream_key_rotate", "stream:"+st.Slug, map[string]any{"oldVersion": st.KeyVersion})
		return nil
	}); err != nil {
		return "", err
	}
	s.Enforcer.KickPublisher(ctx, id, "key_rotated")
	s.Enforcer.EnforceNow(ctx, "key_rotated") // path-mode viewers are on the old path
	return key, nil
}

// RevokeKey removes the key: no publish possible until a new key is issued.
func (s *Service) RevokeKey(ctx context.Context, a Actor, id int64) error {
	st, err := s.GetStream(ctx, id)
	if err != nil {
		return err
	}
	if err := s.St.Tx(ctx, func(tx *sql.Tx) error {
		if err := s.setKeyTx(ctx, tx, id, ""); err != nil {
			return err
		}
		s.auditExec(ctx, tx, a, "stream_key_revoke", "stream:"+st.Slug, nil)
		return nil
	}); err != nil {
		return err
	}
	s.Enforcer.KickPublisher(ctx, id, "key_revoked")
	return nil
}

// RevealKey returns the current key and pult URLs (admin only; audited).
func (s *Service) RevealKey(ctx context.Context, a Actor, id int64) (string, error) {
	st, err := s.GetStream(ctx, id)
	if err != nil {
		return "", err
	}
	k, err := s.streamKey(st)
	if err != nil {
		return "", err
	}
	s.Audit(ctx, a, "stream_key_view", "stream:"+st.Slug, nil)
	return k, nil
}

// StreamKeyInternal is used by the built-in demo publisher only.
func (s *Service) StreamKeyInternal(st *Stream) (string, error) { return s.streamKey(st) }

func (s *Service) SetPublishEnabled(ctx context.Context, a Actor, id int64, on bool) error {
	st, err := s.GetStream(ctx, id)
	if err != nil {
		return err
	}
	if _, err := s.St.DB.ExecContext(ctx, `UPDATE streams SET publish_enabled=?, updated_at=? WHERE id=?`, on, s.nowMs(), id); err != nil {
		return err
	}
	s.Audit(ctx, a, map[bool]string{true: "stream_publish_allow", false: "stream_publish_block"}[on], "stream:"+st.Slug, nil)
	if !on {
		s.Enforcer.KickPublisher(ctx, id, "publish_blocked")
	}
	return nil
}

func (s *Service) SetViewingEnabled(ctx context.Context, a Actor, id int64, on bool) error {
	st, err := s.GetStream(ctx, id)
	if err != nil {
		return err
	}
	if _, err := s.St.DB.ExecContext(ctx, `UPDATE streams SET viewing_enabled=?, updated_at=? WHERE id=?`, on, s.nowMs(), id); err != nil {
		return err
	}
	s.Audit(ctx, a, map[bool]string{true: "stream_view_open", false: "stream_view_close"}[on], "stream:"+st.Slug, nil)
	if !on {
		s.Enforcer.EnforceNow(ctx, "stream_closed")
	}
	return nil
}

func (s *Service) DeleteStream(ctx context.Context, a Actor, id int64) error {
	st, err := s.GetStream(ctx, id)
	if err != nil {
		return err
	}
	// Close first (DB), cut media, then delete.
	s.St.DB.ExecContext(ctx, `UPDATE streams SET viewing_enabled=0, publish_enabled=0 WHERE id=?`, id)
	s.Enforcer.KickPublisher(ctx, id, "stream_deleted")
	s.Enforcer.EnforceNow(ctx, "stream_deleted")
	s.St.DB.ExecContext(ctx, `UPDATE grants SET revoked_at=? WHERE object_type='content' AND object_id IN (SELECT id FROM contents WHERE stream_id=?) AND revoked_at IS NULL`, s.nowMs(), id)
	if _, err := s.St.DB.ExecContext(ctx, `DELETE FROM streams WHERE id=?`, id); err != nil {
		return err
	}
	s.Audit(ctx, a, "stream_delete", "stream:"+st.Slug, nil)
	return nil
}

// ---- legacy stream-level permissions (v1 API, kept for compatibility) ----

func (s *Service) streamContentIDs(ctx context.Context, streamIDs []int64) ([]GrantObject, error) {
	var objs []GrantObject
	for _, sid := range streamIDs {
		c, err := s.ContentForStream(ctx, sid)
		if err != nil {
			return nil, errf(400, "bad_stream", "Stream topilmadi")
		}
		objs = append(objs, GrantObject{Type: "content", ID: c.ID})
	}
	return objs, nil
}

// Grant gives subject access to streams (content grants of their stream items).
func (s *Service) Grant(ctx context.Context, a Actor, subjectType string, subjectID int64, streamIDs []int64, expiresAt *int64) error {
	if len(streamIDs) == 0 {
		return errf(400, "no_streams", "Kamida bitta streamni tanlang")
	}
	objs, err := s.streamContentIDs(ctx, streamIDs)
	if err != nil {
		return err
	}
	return s.GrantObjects(ctx, a, subjectType, []int64{subjectID}, objs, expiresAt)
}

// Revoke removes the direct content grant of one stream for a subject.
func (s *Service) Revoke(ctx context.Context, a Actor, subjectType string, subjectID, streamID int64) error {
	c, err := s.ContentForStream(ctx, streamID)
	if err != nil {
		return err
	}
	return s.RevokeObject(ctx, a, subjectType, subjectID, "content", c.ID)
}

// RevokeObject revokes all active grants of subject on one object.
func (s *Service) RevokeObject(ctx context.Context, a Actor, subjectType string, subjectID int64, objType string, objID int64) error {
	res, err := s.St.DB.ExecContext(ctx, `UPDATE grants SET revoked_at=?, revoked_by=? WHERE subject_type=? AND subject_id=? AND object_type=? AND object_id=? AND revoked_at IS NULL`,
		s.nowMs(), a.ID, subjectType, subjectID, objType, objID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	s.Audit(ctx, a, "permission_revoke", subjectType+":"+itoa(subjectID), map[string]any{objType: objID})
	s.Enforcer.EnforceNow(ctx, "revoke")
	s.notifySubject(ctx, subjectType, subjectID, "permissions")
	return nil
}

func (s *Service) notifySubject(ctx context.Context, subjectType string, subjectID int64, kind string) {
	for _, id := range s.activeSessionIDs(ctx, subjectSessionsCol(subjectType)+"=?", subjectID) {
		s.Events.ToSession(id, kind, nil)
	}
}

func nullPtr(v *int64) any {
	if v == nil {
		return nil
	}
	return *v
}
