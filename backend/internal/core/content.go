package core

import (
	"context"
	"database/sql"
	"strings"
)

// Content is one library item shown to viewers: a live drone stream, a text,
// an image or an uploaded video. Title is the viewer-facing title; the
// technical stream slug/publish path is never replaced by it.
type Content struct {
	ID          int64  `json:"id"`
	Type        string `json:"type"` // stream | text | image | video
	Title       string `json:"title"`
	Description string `json:"description"`
	Visible     bool   `json:"visible"`
	SortOrder   int64  `json:"sortOrder"`
	StreamID    *int64 `json:"streamId,omitempty"`
	Body        string `json:"body,omitempty"`
	FileID      string `json:"-"`
	Mime        string `json:"mime,omitempty"`
	Size        int64  `json:"size,omitempty"`
	Width       int    `json:"width,omitempty"`
	Height      int    `json:"height,omitempty"`
	Codec       string `json:"codec,omitempty"`
	HasThumb    bool   `json:"hasThumb"`
	SHA256      string `json:"-"`
	CreatedAt   int64  `json:"createdAt"`
	UpdatedAt   int64  `json:"updatedAt"`
	StreamSlug  string `json:"streamSlug,omitempty"` // admin only (technical)
}

const contentCols = `c.id,c.type,c.title,c.description,c.visible,c.sort_order,c.stream_id,c.body,c.file_id,c.mime,c.size,c.width,c.height,c.codec,c.has_thumb,c.sha256,c.created_at,c.updated_at,COALESCE(st.slug,'')`
const contentFrom = ` FROM contents c LEFT JOIN streams st ON st.id=c.stream_id`

func scanContent(row interface{ Scan(...any) error }) (*Content, error) {
	var c Content
	var sid sql.NullInt64
	err := row.Scan(&c.ID, &c.Type, &c.Title, &c.Description, &c.Visible, &c.SortOrder, &sid, &c.Body, &c.FileID, &c.Mime, &c.Size, &c.Width, &c.Height, &c.Codec, &c.HasThumb, &c.SHA256, &c.CreatedAt, &c.UpdatedAt, &c.StreamSlug)
	c.StreamID = nullable(sid)
	return &c, err
}

func (s *Service) ListContents(ctx context.Context, q, typ string) ([]*Content, error) {
	sqlq := `SELECT ` + contentCols + contentFrom + ` WHERE 1=1`
	args := []any{}
	if typ != "" {
		sqlq += ` AND c.type=?`
		args = append(args, typ)
	}
	if q = strings.TrimSpace(q); q != "" {
		sqlq += ` AND (c.title LIKE ? OR c.description LIKE ? OR COALESCE(st.slug,'') LIKE ?)`
		like := "%" + q + "%"
		args = append(args, like, like, like)
	}
	sqlq += ` ORDER BY c.sort_order, c.id`
	rows, err := s.St.DB.QueryContext(ctx, sqlq, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Content{}
	for rows.Next() {
		c, err := scanContent(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Service) GetContent(ctx context.Context, id int64) (*Content, error) {
	c, err := scanContent(s.St.DB.QueryRowContext(ctx, `SELECT `+contentCols+contentFrom+` WHERE c.id=?`, id))
	if isNoRows(err) {
		return nil, ErrNotFound
	}
	return c, err
}

func (s *Service) ContentForStream(ctx context.Context, streamID int64) (*Content, error) {
	c, err := scanContent(s.St.DB.QueryRowContext(ctx, `SELECT `+contentCols+contentFrom+` WHERE c.stream_id=?`, streamID))
	if isNoRows(err) {
		return nil, ErrNotFound
	}
	return c, err
}

const MaxTextChars = 20000

func (s *Service) CreateText(ctx context.Context, a Actor, title, desc, body string) (*Content, error) {
	title = cleanText(title, 120, false)
	if title == "" {
		return nil, errf(400, "bad_title", "Sarlavhani kiriting")
	}
	body = cleanText(body, MaxTextChars, true)
	if body == "" {
		return nil, errf(400, "bad_body", "Matnni kiriting")
	}
	now := s.nowMs()
	res, err := s.St.DB.ExecContext(ctx, `INSERT INTO contents(type,title,description,body,sort_order,created_at,updated_at) VALUES('text',?,?,?,(SELECT COALESCE(MAX(sort_order),0)+10 FROM contents),?,?)`,
		title, cleanText(desc, 500, true), body, now, now)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	s.Audit(ctx, a, "content_create", "content:"+itoa(id), map[string]any{"type": "text"})
	s.Events.ToAll("library", nil)
	return s.GetContent(ctx, id)
}

// FileMeta is what the media store reports after validating an upload.
type FileMeta struct {
	FileID, Mime, Codec, SHA256 string
	Size                        int64
	Width, Height               int
	HasThumb                    bool
}

func (s *Service) CreateFileContent(ctx context.Context, a Actor, typ, title, desc string, m FileMeta) (*Content, error) {
	if typ != "image" && typ != "video" {
		return nil, ErrBadRequest
	}
	title = cleanText(title, 120, false)
	if title == "" {
		title = map[string]string{"image": "Rasm", "video": "Video"}[typ]
	}
	now := s.nowMs()
	res, err := s.St.DB.ExecContext(ctx, `INSERT INTO contents(type,title,description,file_id,mime,size,width,height,codec,has_thumb,sha256,sort_order,created_at,updated_at)
	  VALUES(?,?,?,?,?,?,?,?,?,?,?,(SELECT COALESCE(MAX(sort_order),0)+10 FROM contents),?,?)`,
		typ, title, cleanText(desc, 500, true), m.FileID, m.Mime, m.Size, m.Width, m.Height, m.Codec, m.HasThumb, m.SHA256, now, now)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	s.Audit(ctx, a, "content_create", "content:"+itoa(id), map[string]any{"type": typ, "mime": m.Mime, "size": m.Size})
	s.Events.ToAll("library", nil)
	return s.GetContent(ctx, id)
}

type ContentUpdate struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Visible     *bool   `json:"visible"`
	SortOrder   *int64  `json:"sortOrder"`
	Body        *string `json:"body"`
}

func (s *Service) UpdateContent(ctx context.Context, a Actor, id int64, u ContentUpdate) error {
	c, err := s.GetContent(ctx, id)
	if err != nil {
		return err
	}
	if u.Title != nil {
		t := cleanText(*u.Title, 120, false)
		if t == "" {
			return errf(400, "bad_title", "Sarlavha bo'sh bo'lishi mumkin emas")
		}
		c.Title = t
	}
	if u.Description != nil {
		c.Description = cleanText(*u.Description, 500, true)
	}
	if u.Visible != nil {
		c.Visible = *u.Visible
	}
	if u.SortOrder != nil {
		c.SortOrder = *u.SortOrder
	}
	if u.Body != nil {
		if c.Type != "text" {
			return ErrBadRequest
		}
		c.Body = cleanText(*u.Body, MaxTextChars, true)
	}
	if _, err := s.St.DB.ExecContext(ctx, `UPDATE contents SET title=?, description=?, visible=?, sort_order=?, body=?, updated_at=? WHERE id=?`,
		c.Title, c.Description, c.Visible, c.SortOrder, c.Body, s.nowMs(), id); err != nil {
		return err
	}
	s.Audit(ctx, a, "content_update", "content:"+itoa(id), map[string]any{"visible": c.Visible})
	if u.Visible != nil && !*u.Visible {
		s.Enforcer.EnforceNow(ctx, "content_hidden")
	}
	s.Events.ToAll("library", nil)
	return nil
}

// BulkUpdate applies the same title and/or visibility to several items.
func (s *Service) BulkUpdate(ctx context.Context, a Actor, ids []int64, title *string, visible *bool) (int, error) {
	if len(ids) == 0 || len(ids) > 500 {
		return 0, ErrBadRequest
	}
	n := 0
	for _, id := range ids {
		if err := s.UpdateContent(ctx, a, id, ContentUpdate{Title: title, Visible: visible}); err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}

// DeleteContent removes a text/image/video item (streams are deleted via the
// stream). Returns the file id so the caller can remove the file.
func (s *Service) DeleteContent(ctx context.Context, a Actor, id int64) (string, error) {
	c, err := s.GetContent(ctx, id)
	if err != nil {
		return "", err
	}
	if c.Type == "stream" {
		return "", errf(400, "is_stream", "Dron streami Pultlar bo'limidan o'chiriladi")
	}
	// Hide first (DB), cut ongoing deliveries, then delete.
	s.St.DB.ExecContext(ctx, `UPDATE contents SET visible=0 WHERE id=?`, id)
	s.St.DB.ExecContext(ctx, `UPDATE grants SET revoked_at=? WHERE object_type='content' AND object_id=? AND revoked_at IS NULL`, s.nowMs(), id)
	s.Enforcer.EnforceNow(ctx, "content_deleted")
	if _, err := s.St.DB.ExecContext(ctx, `DELETE FROM contents WHERE id=?`, id); err != nil {
		return "", err
	}
	s.Audit(ctx, a, "content_delete", "content:"+itoa(id), map[string]any{"type": c.Type})
	s.Events.ToAll("library", nil)
	return c.FileID, nil
}

// ---- collections ----

type CollectionItem struct {
	ContentID int64  `json:"contentId"`
	ItemTitle string `json:"itemTitle"`
	SortOrder int64  `json:"sortOrder"`
}

type Collection struct {
	ID          int64            `json:"id"`
	Title       string           `json:"title"`
	Description string           `json:"description"`
	Visible     bool             `json:"visible"`
	SortOrder   int64            `json:"sortOrder"`
	Items       []CollectionItem `json:"items"`
	CreatedAt   int64            `json:"createdAt"`
}

func (s *Service) ListCollections(ctx context.Context) ([]*Collection, error) {
	rows, err := s.St.DB.QueryContext(ctx, `SELECT id,title,description,visible,sort_order,created_at FROM collections ORDER BY sort_order,id`)
	if err != nil {
		return nil, err
	}
	out := []*Collection{}
	idx := map[int64]*Collection{}
	for rows.Next() {
		var c Collection
		if err := rows.Scan(&c.ID, &c.Title, &c.Description, &c.Visible, &c.SortOrder, &c.CreatedAt); err != nil {
			rows.Close()
			return nil, err
		}
		c.Items = []CollectionItem{}
		out = append(out, &c)
		idx[c.ID] = &c
	}
	rows.Close()
	irows, err := s.St.DB.QueryContext(ctx, `SELECT collection_id,content_id,item_title,sort_order FROM collection_items ORDER BY collection_id,sort_order,content_id`)
	if err != nil {
		return nil, err
	}
	defer irows.Close()
	for irows.Next() {
		var cid int64
		var it CollectionItem
		if err := irows.Scan(&cid, &it.ContentID, &it.ItemTitle, &it.SortOrder); err != nil {
			return nil, err
		}
		if c := idx[cid]; c != nil {
			c.Items = append(c.Items, it)
		}
	}
	return out, irows.Err()
}

type CollectionInput struct {
	Title       string           `json:"title"`
	Description string           `json:"description"`
	Visible     *bool            `json:"visible"`
	SortOrder   *int64           `json:"sortOrder"`
	Items       []CollectionItem `json:"items"`
}

func (s *Service) SaveCollection(ctx context.Context, a Actor, id int64, in CollectionInput) (int64, error) {
	in.Title = cleanText(in.Title, 120, false)
	if in.Title == "" {
		return 0, errf(400, "bad_title", "To'plam sarlavhasini kiriting")
	}
	now := s.nowMs()
	vis := true
	if in.Visible != nil {
		vis = *in.Visible
	}
	err := s.St.Tx(ctx, func(tx *sql.Tx) error {
		if id == 0 {
			res, err := tx.ExecContext(ctx, `INSERT INTO collections(title,description,visible,sort_order,created_at,updated_at) VALUES(?,?,?,(SELECT COALESCE(MAX(sort_order),0)+10 FROM collections),?,?)`,
				in.Title, cleanText(in.Description, 500, true), vis, now, now)
			if err != nil {
				return err
			}
			id, _ = res.LastInsertId()
		} else {
			q := `UPDATE collections SET title=?, description=?, visible=?, updated_at=?`
			args := []any{in.Title, cleanText(in.Description, 500, true), vis, now}
			if in.SortOrder != nil {
				q += `, sort_order=?`
				args = append(args, *in.SortOrder)
			}
			res, err := tx.ExecContext(ctx, q+` WHERE id=?`, append(args, id)...)
			if err != nil {
				return err
			}
			if n, _ := res.RowsAffected(); n == 0 {
				return ErrNotFound
			}
		}
		if in.Items != nil {
			old := map[int64]int64{}
			r, err := tx.QueryContext(ctx, `SELECT content_id, added_at FROM collection_items WHERE collection_id=?`, id)
			if err != nil {
				return err
			}
			for r.Next() {
				var c, t int64
				r.Scan(&c, &t)
				old[c] = t
			}
			r.Close()
			if _, err := tx.ExecContext(ctx, `DELETE FROM collection_items WHERE collection_id=?`, id); err != nil {
				return err
			}
			for i, it := range in.Items {
				added := old[it.ContentID]
				if added == 0 {
					added = now
				}
				if _, err := tx.ExecContext(ctx, `INSERT INTO collection_items(collection_id,content_id,item_title,sort_order,added_at) VALUES(?,?,?,?,?)`,
					id, it.ContentID, cleanText(it.ItemTitle, 120, false), int64(i)*10, added); err != nil {
					return errf(400, "bad_item", "Kontent topilmadi yoki takrorlangan")
				}
			}
		}
		s.auditExec(ctx, tx, a, "collection_save", "collection:"+itoa(id), map[string]any{"items": len(in.Items)})
		return nil
	})
	if err != nil {
		return 0, err
	}
	// Items removed from a collection lose "include future" access immediately.
	s.Enforcer.EnforceNow(ctx, "collection_changed")
	s.Events.ToAll("library", nil)
	return id, nil
}

func (s *Service) DeleteCollection(ctx context.Context, a Actor, id int64) error {
	now := s.nowMs()
	s.St.DB.ExecContext(ctx, `UPDATE grants SET revoked_at=? WHERE object_type='collection' AND object_id=? AND revoked_at IS NULL`, now, id)
	res, err := s.St.DB.ExecContext(ctx, `DELETE FROM collections WHERE id=?`, id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	s.Audit(ctx, a, "collection_delete", "collection:"+itoa(id), nil)
	s.Enforcer.EnforceNow(ctx, "collection_deleted")
	s.Events.ToAll("library", nil)
	return nil
}
