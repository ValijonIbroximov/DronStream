package core

import (
	"context"
	"database/sql"
)

// GrantObject is what a grant points at. For a collection, IncludeFuture
// decides the policy explicitly:
//   - true  ("dinamik"): access to whatever is in the collection at check time,
//     including items added later; removing an item removes access.
//   - false ("hozirgi elementlar"): expanded at grant time into one content
//     grant per current item; later additions are NOT included.
type GrantObject struct {
	Type          string `json:"type"` // content | collection
	ID            int64  `json:"id"`
	IncludeFuture bool   `json:"includeFuture"`
}

type Grant struct {
	ID                 int64  `json:"id"`
	SubjectType        string `json:"subjectType"`
	SubjectID          int64  `json:"subjectId"`
	SubjectName        string `json:"subjectName"`
	ObjectType         string `json:"objectType"`
	ObjectID           int64  `json:"objectId"`
	ObjectTitle        string `json:"objectTitle"`
	ContentType        string `json:"contentType,omitempty"`
	IncludeFuture      bool   `json:"includeFuture"`
	SourceCollectionID *int64 `json:"sourceCollectionId,omitempty"`
	GrantedAt          int64  `json:"grantedAt"`
	GrantedBy          string `json:"grantedBy"`
	ExpiresAt          *int64 `json:"expiresAt"`
}

func validSubject(t string) bool { return t == "user" || t == "guest" || t == "link" }

// subjectSessionsCol maps a subject type to the web_sessions column.
func subjectSessionsCol(t string) string {
	switch t {
	case "guest":
		return "guest_id"
	case "link":
		return "link_id"
	}
	return "user_id"
}

func (s *Service) checkSubjectTx(ctx context.Context, tx *sql.Tx, t string, id int64) error {
	var q string
	switch t {
	case "user":
		q = `SELECT count(*) FROM users WHERE id=?`
	case "guest":
		q = `SELECT count(*) FROM guests WHERE id=? AND status='approved'`
	case "link":
		q = `SELECT count(*) FROM access_links WHERE id=? AND revoked_at IS NULL`
	default:
		return ErrBadRequest
	}
	var n int
	if err := tx.QueryRowContext(ctx, q, id).Scan(&n); err != nil {
		return err
	}
	if n == 0 {
		return errf(400, "bad_subject", "Oluvchi topilmadi (mehmon tasdiqlangan, havola bekor qilinmagan bo'lishi kerak)")
	}
	return nil
}

// grantTx writes grants for one subject. Existing active grants for the same
// subject+object are replaced (so the expiry can be changed).
func (s *Service) grantTx(ctx context.Context, tx *sql.Tx, a Actor, subjType string, subjID int64, objs []GrantObject, expiresAt *int64) error {
	now := s.nowMs()
	put := func(objType string, objID int64, future bool, src *int64) error {
		if _, err := tx.ExecContext(ctx, `UPDATE grants SET revoked_at=?, revoked_by=? WHERE subject_type=? AND subject_id=? AND object_type=? AND object_id=? AND revoked_at IS NULL`,
			now, a.ID, subjType, subjID, objType, objID); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `INSERT INTO grants(subject_type,subject_id,object_type,object_id,include_future,source_collection_id,granted_by,granted_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)`,
			subjType, subjID, objType, objID, future, nullPtr(src), a.ID, now, nullPtr(expiresAt))
		return err
	}
	for _, o := range objs {
		switch o.Type {
		case "content":
			var n int
			tx.QueryRowContext(ctx, `SELECT count(*) FROM contents WHERE id=?`, o.ID).Scan(&n)
			if n == 0 {
				return errf(400, "bad_object", "Kontent topilmadi")
			}
			if err := put("content", o.ID, false, nil); err != nil {
				return err
			}
		case "collection":
			var n int
			tx.QueryRowContext(ctx, `SELECT count(*) FROM collections WHERE id=?`, o.ID).Scan(&n)
			if n == 0 {
				return errf(400, "bad_object", "To'plam topilmadi")
			}
			if o.IncludeFuture {
				if err := put("collection", o.ID, true, nil); err != nil {
					return err
				}
				continue
			}
			rows, err := tx.QueryContext(ctx, `SELECT content_id FROM collection_items WHERE collection_id=?`, o.ID)
			if err != nil {
				return err
			}
			var ids []int64
			for rows.Next() {
				var id int64
				rows.Scan(&id)
				ids = append(ids, id)
			}
			rows.Close()
			src := o.ID
			for _, cid := range ids {
				if err := put("content", cid, false, &src); err != nil {
					return err
				}
			}
		default:
			return ErrBadRequest
		}
	}
	return nil
}

// GrantObjects gives several subjects the same access ("Qo'llash").
func (s *Service) GrantObjects(ctx context.Context, a Actor, subjType string, subjIDs []int64, objs []GrantObject, expiresAt *int64) error {
	if !validSubject(subjType) || len(subjIDs) == 0 {
		return ErrBadRequest
	}
	if len(objs) == 0 {
		return errf(400, "no_objects", "Kamida bitta kontent yoki to'plamni tanlang")
	}
	if expiresAt != nil && *expiresAt <= s.nowMs() {
		return errf(400, "bad_until", "Tugash vaqti kelajakda bo'lishi kerak")
	}
	err := s.St.Tx(ctx, func(tx *sql.Tx) error {
		for _, id := range subjIDs {
			if err := s.checkSubjectTx(ctx, tx, subjType, id); err != nil {
				return err
			}
			if err := s.grantTx(ctx, tx, a, subjType, id, objs, expiresAt); err != nil {
				return err
			}
			s.auditExec(ctx, tx, a, "permission_grant", subjType+":"+itoa(id), map[string]any{"objects": objs, "expiresAt": expiresAt})
		}
		return nil
	})
	if err != nil {
		return err
	}
	s.Enforcer.EnforceNow(ctx, "grant") // shortened expiry applies to live sessions
	for _, id := range subjIDs {
		s.notifySubject(ctx, subjType, id, "permissions")
	}
	return nil
}

// RevokeGrant revokes one grant row. DB first, then live media is cut.
func (s *Service) RevokeGrant(ctx context.Context, a Actor, grantID int64) error {
	var st string
	var sid int64
	if err := s.St.DB.QueryRowContext(ctx, `SELECT subject_type, subject_id FROM grants WHERE id=? AND revoked_at IS NULL`, grantID).Scan(&st, &sid); err != nil {
		return ErrNotFound
	}
	if _, err := s.St.DB.ExecContext(ctx, `UPDATE grants SET revoked_at=?, revoked_by=? WHERE id=?`, s.nowMs(), a.ID, grantID); err != nil {
		return err
	}
	s.Audit(ctx, a, "permission_revoke", st+":"+itoa(sid), map[string]any{"grant": grantID})
	s.Enforcer.EnforceNow(ctx, "revoke")
	s.notifySubject(ctx, st, sid, "permissions")
	return nil
}

// CopyGrants copies the active grants of one subject to another (template).
func (s *Service) CopyGrants(ctx context.Context, a Actor, fromType string, fromID int64, toType string, toID int64) (int, error) {
	gs, err := s.ListGrants(ctx, fromType, fromID)
	if err != nil {
		return 0, err
	}
	var objs []GrantObject
	for _, g := range gs {
		objs = append(objs, GrantObject{Type: g.ObjectType, ID: g.ObjectID, IncludeFuture: g.IncludeFuture})
	}
	if len(objs) == 0 {
		return 0, errf(400, "empty", "Nusxalanadigan ruxsat yo'q")
	}
	return len(objs), s.GrantObjects(ctx, a, toType, []int64{toID}, objs, nil)
}

func (s *Service) ListGrants(ctx context.Context, subjType string, subjID int64) ([]Grant, error) {
	q := `SELECT g.id,g.subject_type,g.subject_id,
	  CASE g.subject_type WHEN 'user' THEN COALESCE((SELECT display_name||' ('||username||')' FROM users WHERE id=g.subject_id),'?')
	    WHEN 'guest' THEN COALESCE((SELECT 'Mehmon: '||display_name FROM guests WHERE id=g.subject_id),'?')
	    ELSE COALESCE((SELECT 'Havola: '||name FROM access_links WHERE id=g.subject_id),'?') END,
	  g.object_type,g.object_id,
	  CASE g.object_type WHEN 'content' THEN COALESCE((SELECT title FROM contents WHERE id=g.object_id),'(o''chirilgan)') ELSE COALESCE((SELECT 'To''plam: '||title FROM collections WHERE id=g.object_id),'(o''chirilgan)') END,
	  CASE g.object_type WHEN 'content' THEN COALESCE((SELECT type FROM contents WHERE id=g.object_id),'') ELSE 'collection' END,
	  g.include_future,g.source_collection_id,g.granted_at,COALESCE((SELECT display_name FROM users WHERE id=g.granted_by),''),g.expires_at
	  FROM grants g WHERE g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at > ?)`
	args := []any{s.nowMs()}
	if subjType != "" {
		q += ` AND g.subject_type=?`
		args = append(args, subjType)
	}
	if subjID != 0 {
		q += ` AND g.subject_id=?`
		args = append(args, subjID)
	}
	rows, err := s.St.DB.QueryContext(ctx, q+` ORDER BY g.subject_type,g.subject_id,g.id`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Grant{}
	for rows.Next() {
		var g Grant
		var src, exp sql.NullInt64
		if err := rows.Scan(&g.ID, &g.SubjectType, &g.SubjectID, &g.SubjectName, &g.ObjectType, &g.ObjectID, &g.ObjectTitle, &g.ContentType, &g.IncludeFuture, &src, &g.GrantedAt, &g.GrantedBy, &exp); err != nil {
			return nil, err
		}
		g.SourceCollectionID, g.ExpiresAt = nullable(src), nullable(exp)
		out = append(out, g)
	}
	return out, rows.Err()
}

// grantDecision checks the grants of a subject for one content item.
// Returns ok, the latest validity end (0 = unbounded) and a deny reason.
func grantDecision(ctx context.Context, q querier, subjType string, subjID, contentID, now int64) (bool, int64, string) {
	var nActive, nUnbounded int
	var maxExp sql.NullInt64
	err := q.QueryRowContext(ctx, `SELECT count(*), COALESCE(SUM(g.expires_at IS NULL),0), MAX(g.expires_at) FROM grants g
	  WHERE g.subject_type=? AND g.subject_id=? AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at > ?) AND (
	   (g.object_type='content' AND g.object_id=?) OR
	   (g.object_type='collection' AND g.include_future=1 AND EXISTS (SELECT 1 FROM collection_items ci JOIN collections co ON co.id=ci.collection_id
	      WHERE ci.collection_id=g.object_id AND ci.content_id=? AND co.visible=1)))`,
		subjType, subjID, now, contentID, contentID).Scan(&nActive, &nUnbounded, &maxExp)
	if err != nil {
		return false, 0, "internal_error"
	}
	if nActive > 0 {
		if nUnbounded > 0 {
			return true, 0, ""
		}
		return true, maxExp.Int64, ""
	}
	// Explain the denial from the most recent direct grant, if any.
	var exp, rev sql.NullInt64
	err = q.QueryRowContext(ctx, `SELECT expires_at, revoked_at FROM grants WHERE subject_type=? AND subject_id=? AND object_type='content' AND object_id=? ORDER BY id DESC LIMIT 1`,
		subjType, subjID, contentID).Scan(&exp, &rev)
	switch {
	case isNoRows(err):
		return false, 0, "no_permission"
	case err != nil:
		return false, 0, "internal_error"
	case rev.Valid:
		return false, 0, "permission_revoked"
	case exp.Valid && exp.Int64 <= now:
		return false, 0, "permission_expired"
	}
	return false, 0, "no_permission"
}

type subjectInfo struct {
	Type  string
	ID    int64
	Admin bool
	Until int64
}

// sessionSubject validates the browser session and returns who it is.
func (s *Service) sessionSubject(ctx context.Context, q querier, wsID, now int64) (subjectInfo, string) {
	var (
		kind, revokeReason, role, userStatus, guestStatus, linkUserStatus string
		userID, guestID, linkID, expires                                  int64
		revoked, guestUntil, linkRevoked, linkStarts, linkEnds            sql.NullInt64
	)
	err := q.QueryRowContext(ctx, `SELECT ws.kind, COALESCE(ws.user_id,0), COALESCE(ws.guest_id,0), COALESCE(ws.link_id,0), ws.revoked_at, ws.revoke_reason, ws.expires_at,
	  COALESCE(u.role,''), COALESCE(u.status,''), COALESCE(g.status,''), g.access_until,
	  l.revoked_at, l.starts_at, l.ends_at, COALESCE((SELECT status FROM users WHERE id=l.for_user_id),'')
	  FROM web_sessions ws LEFT JOIN users u ON u.id=ws.user_id LEFT JOIN guests g ON g.id=ws.guest_id LEFT JOIN access_links l ON l.id=ws.link_id WHERE ws.id=?`, wsID).
		Scan(&kind, &userID, &guestID, &linkID, &revoked, &revokeReason, &expires, &role, &userStatus, &guestStatus, &guestUntil, &linkRevoked, &linkStarts, &linkEnds, &linkUserStatus)
	if err != nil {
		if isNoRows(err) {
			return subjectInfo{}, "session_ended"
		}
		return subjectInfo{}, "internal_error"
	}
	if revoked.Valid {
		switch revokeReason {
		case "user_blocked", "guest_ended", "password_reset", "link_revoked":
			return subjectInfo{}, revokeReason
		}
		return subjectInfo{}, "session_ended"
	}
	if expires <= now {
		if kind == "link" && linkEnds.Valid && linkEnds.Int64 <= now {
			return subjectInfo{}, "link_expired"
		}
		return subjectInfo{}, "session_expired"
	}
	switch kind {
	case "user":
		if userStatus != "active" {
			return subjectInfo{}, "user_blocked"
		}
		return subjectInfo{Type: "user", ID: userID, Admin: role == "admin", Until: expires}, ""
	case "guest":
		switch guestStatus {
		case "approved":
		case "pending":
			return subjectInfo{}, "guest_pending"
		case "rejected":
			return subjectInfo{}, "guest_rejected"
		default:
			return subjectInfo{}, "guest_ended"
		}
		until := expires
		if guestUntil.Valid {
			if guestUntil.Int64 <= now {
				return subjectInfo{}, "guest_expired"
			}
			until = minPositive(until, guestUntil.Int64)
		}
		return subjectInfo{Type: "guest", ID: guestID, Until: until}, ""
	case "link":
		if linkRevoked.Valid {
			return subjectInfo{}, "link_revoked"
		}
		if linkStarts.Valid && linkStarts.Int64 > now {
			return subjectInfo{}, "link_not_started"
		}
		until := expires
		if linkEnds.Valid {
			if linkEnds.Int64 <= now {
				return subjectInfo{}, "link_expired"
			}
			until = minPositive(until, linkEnds.Int64)
		}
		if linkUserStatus == "blocked" {
			return subjectInfo{}, "user_blocked"
		}
		return subjectInfo{Type: "link", ID: linkID, Until: until}, ""
	}
	return subjectInfo{}, "session_ended"
}

// authorizeContent is the single authorisation function for every kind of
// content (live stream tickets, MediaMTX hook, reconciler, file/thumbnail
// delivery, text in the library).
func (s *Service) authorizeContent(ctx context.Context, q querier, wsID, contentID, now int64, sys SystemState) Decision {
	if sys.InstanceState != "active" {
		return deny("instance_" + sys.InstanceState)
	}
	if sys.EmergencyStop {
		return deny("emergency_stop")
	}
	var typ string
	var visible bool
	var viewing sql.NullBool
	err := q.QueryRowContext(ctx, `SELECT c.type, c.visible, st.viewing_enabled FROM contents c LEFT JOIN streams st ON st.id=c.stream_id WHERE c.id=?`, contentID).Scan(&typ, &visible, &viewing)
	if isNoRows(err) {
		return deny("content_deleted")
	}
	if err != nil {
		return deny("internal_error")
	}
	if typ == "stream" && viewing.Valid && !viewing.Bool {
		return deny("stream_closed")
	}
	subj, reason := s.sessionSubject(ctx, q, wsID, now)
	if reason != "" {
		return deny(reason)
	}
	if subj.Admin {
		return Decision{OK: true, Until: subj.Until}
	}
	if !visible {
		return deny("content_hidden")
	}
	ok, gUntil, r := grantDecision(ctx, q, subj.Type, subj.ID, contentID, now)
	if !ok {
		return deny(r)
	}
	return Decision{OK: true, Until: minPositive(subj.Until, gUntil)}
}

// authorizeView keeps the stream-based API used by the WebRTC path.
func (s *Service) authorizeView(ctx context.Context, q querier, wsID, streamID, now int64, sys SystemState) Decision {
	var cid int64
	if err := q.QueryRowContext(ctx, `SELECT id FROM contents WHERE stream_id=?`, streamID).Scan(&cid); err != nil {
		if isNoRows(err) {
			return deny("stream_deleted")
		}
		return deny("internal_error")
	}
	return s.authorizeContent(ctx, q, wsID, cid, now, sys)
}

func (s *Service) AuthorizeContent(ctx context.Context, wsID, contentID int64) Decision {
	sys, err := s.State(ctx)
	if err != nil {
		return deny("internal_error")
	}
	return s.authorizeContent(ctx, s.St.DB, wsID, contentID, s.nowMs(), sys)
}

// ---- viewer library ----

type LibraryItem struct {
	*Content
	Until  int64 `json:"until"`
	Online bool  `json:"online,omitempty"`
}

type LibraryCollection struct {
	ID          int64            `json:"id"`
	Title       string           `json:"title"`
	Description string           `json:"description"`
	Items       []CollectionItem `json:"items"`
}

// Library returns only what this session may access now. Unapproved guests
// and sessions without grants get empty lists.
func (s *Service) Library(ctx context.Context, sess *Session) ([]LibraryItem, []LibraryCollection, error) {
	all, err := s.ListContents(ctx, "", "")
	if err != nil {
		return nil, nil, err
	}
	sys, err := s.State(ctx)
	if err != nil {
		return nil, nil, err
	}
	now := s.nowMs()
	items := []LibraryItem{}
	ok := map[int64]bool{}
	for _, c := range all {
		d := s.authorizeContent(ctx, s.St.DB, sess.ID, c.ID, now, sys)
		if !d.OK || (!c.Visible && !sess.IsAdmin()) {
			continue
		}
		c.StreamSlug = ""
		ok[c.ID] = true
		items = append(items, LibraryItem{Content: c, Until: d.Until})
	}
	cols, err := s.ListCollections(ctx)
	if err != nil {
		return nil, nil, err
	}
	outCols := []LibraryCollection{}
	for _, c := range cols {
		if !c.Visible && !sess.IsAdmin() {
			continue
		}
		lc := LibraryCollection{ID: c.ID, Title: c.Title, Description: c.Description, Items: []CollectionItem{}}
		for _, it := range c.Items {
			if ok[it.ContentID] {
				lc.Items = append(lc.Items, it)
			}
		}
		if len(lc.Items) > 0 {
			outCols = append(outCols, lc)
		}
	}
	return items, outCols, nil
}

type PreviewItem struct {
	ContentID int64  `json:"contentId"`
	Type      string `json:"type"`
	Title     string `json:"title"`
	Until     int64  `json:"until"`
	Via       string `json:"via"`
}

// Preview shows what a subject would see, without creating a session or
// consuming any link use.
func (s *Service) Preview(ctx context.Context, subjType string, subjID int64) ([]PreviewItem, string, error) {
	if !validSubject(subjType) {
		return nil, "", ErrBadRequest
	}
	sys, err := s.State(ctx)
	if err != nil {
		return nil, "", err
	}
	note := ""
	now := s.nowMs()
	switch subjType {
	case "user":
		var role, status string
		if err := s.St.DB.QueryRowContext(ctx, `SELECT role,status FROM users WHERE id=?`, subjID).Scan(&role, &status); err != nil {
			return nil, "", ErrNotFound
		}
		if status != "active" {
			note = "Hisob bloklangan: hozir hech narsa ko'rmaydi"
		}
		if role == "admin" {
			note = "Administrator barcha kontentni ko'radi"
		}
	case "link":
		l, err := s.GetLink(ctx, subjID)
		if err != nil {
			return nil, "", err
		}
		if st := l.Status(now); st != "active" {
			note = "Havola holati: " + LinkStatusText(st)
		}
	}
	if sys.EmergencyStop {
		note = "Favqulodda to'xtatish yoqilgan: hozir hech kim hech narsa ko'rmaydi"
	}
	all, err := s.ListContents(ctx, "", "")
	if err != nil {
		return nil, "", err
	}
	out := []PreviewItem{}
	for _, c := range all {
		if !c.Visible {
			continue
		}
		okk, until, _ := grantDecision(ctx, s.St.DB, subjType, subjID, c.ID, now)
		if okk {
			out = append(out, PreviewItem{ContentID: c.ID, Type: c.Type, Title: c.Title, Until: until})
		}
	}
	return out, note, nil
}
