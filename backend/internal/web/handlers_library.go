package web

import (
	"context"
	"errors"
	"io"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/skip2/go-qrcode"

	"dronstream/internal/core"
	"dronstream/internal/media"
	"dronstream/internal/mediafiles"
)

// ---------- viewer ----------

func (s *Server) library(w http.ResponseWriter, r *http.Request) {
	items, cols, err := s.Core.Library(r.Context(), sess(r))
	if err != nil {
		writeErr(w, err)
		return
	}
	for i := range items {
		if items[i].Type == "stream" && items[i].StreamID != nil {
			if st, err := s.Core.GetStream(r.Context(), *items[i].StreamID); err == nil {
				p, _ := s.Core.MediaPath(st)
				items[i].Online = s.Media.Stats(p).Online
				items[i].IsDemo = st.IsDemo
			}
		}
	}
	writeJSON(w, 200, map[string]any{"items": items, "collections": cols})
}

// ctxReadSeeker aborts reads once the transfer is cancelled (revocation).
type ctxReadSeeker struct {
	ctx context.Context
	f   *os.File
}

func (c ctxReadSeeker) Read(p []byte) (int, error) {
	if err := c.ctx.Err(); err != nil {
		return 0, err
	}
	if len(p) > 64<<10 { // small reads => cancellation is noticed quickly
		p = p[:64<<10]
	}
	return c.f.Read(p)
}
func (c ctxReadSeeker) Seek(o int64, wh int) (int64, error) { return c.f.Seek(o, wh) }

// contentFile serves an uploaded image/video (or its thumbnail) after a
// server-side authorisation check on EVERY request, including Range
// requests. The file path comes from the DB, never from the client.
func (s *Server) contentFile(thumb bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := pathID(r)
		if err != nil {
			writeErr(w, err)
			return
		}
		se := sess(r)
		if d := s.Core.AuthorizeContent(r.Context(), se.ID, id); !d.OK {
			writeJSON(w, 403, map[string]string{"code": d.Reason, "message": core.ReasonText(d.Reason)})
			return
		}
		c, err := s.Core.GetContent(r.Context(), id)
		if err != nil || (c.Type != "image" && c.Type != "video") || s.Files == nil {
			writeErr(w, core.ErrNotFound)
			return
		}
		p, err := s.Files.Path(c.FileID)
		ctype := c.Mime
		if thumb {
			if !c.HasThumb {
				writeErr(w, core.ErrNotFound)
				return
			}
			p, err = s.Files.ThumbPath(c.FileID)
			ctype = "image/jpeg"
		}
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
		ctx, cancel := context.WithCancel(r.Context())
		defer cancel()
		untrack := s.Media.TrackTransfer(&media.Transfer{WebSessionID: se.ID, ContentID: id, Cancel: cancel})
		defer untrack()
		h := w.Header()
		h.Set("Content-Type", ctype)
		h.Set("Cache-Control", "private, no-store")
		h.Set("Content-Disposition", mime.FormatMediaType("inline", map[string]string{"filename": "kontent-" + strconv.FormatInt(id, 10) + "." + mediafiles.Ext(ctype)}))
		h.Set("Content-Security-Policy", "default-src 'none'; sandbox")
		http.ServeContent(w, r, "", st.ModTime(), ctxReadSeeker{ctx: ctx, f: f})
	}
}

// ---------- special link landing ----------

func (s *Server) linkInspect(w http.ResponseWriter, r *http.Request) {
	if !s.limLink.Allow(clientIP(r)) {
		writeErr(w, &core.Error{Status: 429, Code: "rate", Msg: "Juda ko'p urinish"})
		return
	}
	var in struct{ Token string }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	info, err := s.Core.InspectLink(r.Context(), in.Token)
	if err != nil {
		writeErr(w, err)
		return
	}
	// Already signed in through this same link in this browser?
	if se := s.sessionFrom(r); se != nil && se.Kind == "link" {
		writeJSON(w, 200, map[string]any{"info": info, "hasSession": true})
		return
	}
	writeJSON(w, 200, map[string]any{"info": info, "hasSession": false})
}

func (s *Server) linkActivate(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if !s.limLink.Allow(ip) {
		writeErr(w, &core.Error{Status: 429, Code: "rate", Msg: "Juda ko'p urinish"})
		return
	}
	var in struct{ Token, RequestID string }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if old := s.sessionFrom(r); old != nil && old.Kind != "link" {
		// Do not silently replace a signed-in account session.
		writeErr(w, &core.Error{Status: 409, Code: "already_signed_in", Msg: "Bu brauzerda boshqa hisob bilan kirilgan. Avval chiqing yoki boshqa brauzerdan foydalaning"})
		return
	}
	tok, se, _, err := s.Core.ActivateLink(r.Context(), in.Token, in.RequestID, ip, r.UserAgent())
	if err != nil {
		writeErr(w, err)
		return
	}
	s.setCookie(w, tok, se.ExpiresAt)
	writeJSON(w, 200, s.sessionPayload(r, se))
}

// ---------- admin: content ----------

func (s *Server) adminContents(w http.ResponseWriter, r *http.Request) {
	l, err := s.Core.ListContents(r.Context(), r.URL.Query().Get("q"), r.URL.Query().Get("type"))
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, l)
}

func (s *Server) adminCreateText(w http.ResponseWriter, r *http.Request) {
	var in struct{ Title, Description, Body string }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	c, err := s.Core.CreateText(r.Context(), actor(r), in.Title, in.Description, in.Body)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, c)
}

// adminUpload streams a multipart upload (fields: kind, title, description,
// then file) to the media store without buffering it in memory.
func (s *Server) adminUpload(w http.ResponseWriter, r *http.Request) {
	if s.Files == nil {
		writeErr(w, core.ErrNotFound)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, s.Files.MaxVideoBytes+(1<<20))
	mr, err := r.MultipartReader()
	if err != nil {
		writeErr(w, core.ErrBadRequest)
		return
	}
	fields := map[string]string{}
	for {
		part, err := mr.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			writeErr(w, &core.Error{Status: 400, Code: "upload", Msg: "Yuklash uzildi yoki fayl juda katta"})
			return
		}
		if part.FormName() != "file" {
			b, _ := io.ReadAll(io.LimitReader(part, 4096))
			fields[part.FormName()] = string(b)
			continue
		}
		kind := fields["kind"]
		if kind != "image" && kind != "video" {
			writeErr(w, &core.Error{Status: 400, Code: "kind", Msg: "Turini tanlang: rasm yoki video"})
			return
		}
		m, err := s.Files.Save(part, kind)
		if err != nil {
			var ue *mediafiles.UserError
			if errors.As(err, &ue) {
				s.Core.Audit(r.Context(), actor(r), "upload_rejected", "", map[string]any{"reason": ue.Msg})
				writeErr(w, &core.Error{Status: 400, Code: "bad_file", Msg: ue.Msg})
				return
			}
			writeErr(w, &core.Error{Status: 400, Code: "upload", Msg: "Faylni saqlab bo'lmadi: " + err.Error()})
			return
		}
		c, err := s.Core.CreateFileContent(r.Context(), actor(r), kind, fields["title"], fields["description"], core.FileMeta{
			FileID: m.FileID, Mime: m.Mime, Codec: m.Codec, SHA256: m.SHA256, Size: m.Size, Width: m.Width, Height: m.Height, HasThumb: m.HasThumb})
		if err != nil {
			s.Files.Remove(m.FileID)
			writeErr(w, err)
			return
		}
		writeJSON(w, 200, c)
		return
	}
	writeErr(w, &core.Error{Status: 400, Code: "no_file", Msg: "Fayl tanlanmagan"})
}

func (s *Server) adminUpdateContent(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var in core.ContentUpdate
	if err == nil {
		err = readJSON(r, &in)
	}
	if err == nil {
		err = s.Core.UpdateContent(r.Context(), actor(r), id, in)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminBulkContent(w http.ResponseWriter, r *http.Request) {
	var in struct {
		IDs     []int64 `json:"ids"`
		Title   *string `json:"title"`
		Visible *bool   `json:"visible"`
	}
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	n, err := s.Core.BulkUpdate(r.Context(), actor(r), in.IDs, in.Title, in.Visible)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]int{"updated": n})
}

func (s *Server) adminDeleteContent(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	fid, err := s.Core.DeleteContent(r.Context(), actor(r), id)
	if err != nil {
		writeErr(w, err)
		return
	}
	if fid != "" && s.Files != nil {
		s.Files.Remove(fid)
	}
	ok(w)
}

// ---------- admin: collections ----------

func (s *Server) adminCollections(w http.ResponseWriter, r *http.Request) {
	l, err := s.Core.ListCollections(r.Context())
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, l)
}

func (s *Server) adminSaveCollection(w http.ResponseWriter, r *http.Request) {
	var id int64
	if r.PathValue("id") != "" {
		var err error
		if id, err = pathID(r); err != nil {
			writeErr(w, err)
			return
		}
	}
	var in core.CollectionInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	nid, err := s.Core.SaveCollection(r.Context(), actor(r), id, in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]int64{"id": nid})
}

func (s *Server) adminDeleteCollection(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		err = s.Core.DeleteCollection(r.Context(), actor(r), id)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

// ---------- admin: grants & preview ----------

func (s *Server) adminGrants(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	sid, _ := strconv.ParseInt(q.Get("subjectId"), 10, 64)
	l, err := s.Core.ListGrants(r.Context(), q.Get("subjectType"), sid)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, l)
}

func (s *Server) adminApplyGrants(w http.ResponseWriter, r *http.Request) {
	var in struct {
		SubjectType string             `json:"subjectType"`
		SubjectIDs  []int64            `json:"subjectIds"`
		Objects     []core.GrantObject `json:"objects"`
		ExpiresAt   *int64             `json:"expiresAt"`
	}
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	if err := s.Core.GrantObjects(r.Context(), actor(r), in.SubjectType, in.SubjectIDs, in.Objects, in.ExpiresAt); err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminRevokeGrant(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		err = s.Core.RevokeGrant(r.Context(), actor(r), id)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminCopyGrants(w http.ResponseWriter, r *http.Request) {
	var in struct {
		FromType string `json:"fromType"`
		FromID   int64  `json:"fromId"`
		ToType   string `json:"toType"`
		ToID     int64  `json:"toId"`
	}
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	n, err := s.Core.CopyGrants(r.Context(), actor(r), in.FromType, in.FromID, in.ToType, in.ToID)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]int{"copied": n})
}

func (s *Server) adminPreview(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	id, _ := strconv.ParseInt(q.Get("subjectId"), 10, 64)
	items, note, err := s.Core.Preview(r.Context(), q.Get("subjectType"), id)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"items": items, "note": note})
}

// ---------- admin: links ----------

func (s *Server) adminLinks(w http.ResponseWriter, r *http.Request) {
	l, err := s.Core.ListLinks(r.Context())
	if err != nil {
		writeErr(w, err)
		return
	}
	type out struct {
		*core.Link
		StatusText string `json:"statusText"`
		Remaining  *int64 `json:"remaining"`
	}
	res := make([]out, 0, len(l))
	for _, x := range l {
		o := out{Link: x, StatusText: core.LinkStatusText(x.StatusCode)}
		if x.MaxUses != nil {
			rem := *x.MaxUses - x.UsesCount
			if rem < 0 {
				rem = 0
			}
			o.Remaining = &rem
		}
		res = append(res, o)
	}
	writeJSON(w, 200, res)
}

func (s *Server) adminCreateLink(w http.ResponseWriter, r *http.Request) {
	var in core.LinkInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	l, tok, err := s.Core.CreateLink(r.Context(), actor(r), in)
	if err != nil {
		writeErr(w, err)
		return
	}
	writeJSON(w, 200, map[string]any{"link": l, "share": s.shareInfo(r, l, tok)})
}

func (s *Server) adminUpdateLink(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var in core.LinkInput
	if err == nil {
		err = readJSON(r, &in)
	}
	if err == nil {
		err = s.Core.UpdateLink(r.Context(), actor(r), id, in)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminRevokeLink(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err == nil {
		err = s.Core.RevokeLink(r.Context(), actor(r), id)
	}
	if err != nil {
		writeErr(w, err)
		return
	}
	ok(w)
}

func (s *Server) adminRegenerateLink(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	var in struct{ EndSessions bool }
	if err == nil {
		readJSON(r, &in)
		var tok string
		tok, err = s.Core.RegenerateLink(r.Context(), actor(r), id, in.EndSessions)
		if err == nil {
			l, _ := s.Core.GetLink(r.Context(), id)
			writeJSON(w, 200, map[string]any{"link": l, "share": s.shareInfo(r, l, tok)})
			return
		}
	}
	writeErr(w, err)
}

func (s *Server) adminLinkShare(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeErr(w, err)
		return
	}
	l, err := s.Core.GetLink(r.Context(), id)
	if err != nil {
		writeErr(w, err)
		return
	}
	tok, err := s.Core.LinkToken(l)
	if err != nil {
		writeErr(w, err)
		return
	}
	s.Core.Audit(r.Context(), actor(r), "link_view", "link:"+strconv.FormatInt(id, 10), nil)
	writeJSON(w, 200, map[string]any{"link": l, "share": s.shareInfo(r, l, tok)})
}

// ---------- public base URL & QR ----------

type shareOut struct {
	URL      string   `json:"url,omitempty"`
	Problem  string   `json:"problem,omitempty"`
	QRSize   int      `json:"qrSize,omitempty"`
	QRRows   []string `json:"qrRows,omitempty"`
	Title    string   `json:"title"`
	EndsAt   *int64   `json:"endsAt,omitempty"`
	FileName string   `json:"fileName"`
}

// BaseURLProblem validates the public base URL used in shared links.
func BaseURLProblem(raw string) string {
	if strings.TrimSpace(raw) == "" {
		return "Tashqi manzil (Public base URL) sozlanmagan. Audit va sozlamalar → Sozlamalar bo'limida kiriting, masalan https://stream.example.uz:8443"
	}
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Host == "" || (u.Path != "" && u.Path != "/") || u.RawQuery != "" || u.Fragment != "" {
		return "Tashqi manzil https://host[:port] ko'rinishida bo'lishi kerak (yo'l, so'rov va # siz)"
	}
	h := u.Hostname()
	if ip := net.ParseIP(h); (ip != nil && (ip.IsLoopback() || ip.IsUnspecified())) || strings.EqualFold(h, "localhost") || strings.HasSuffix(strings.ToLower(h), ".localhost") {
		return "Tashqi manzil localhost bo'lishi mumkin emas — boshqa qurilma unga ulana olmaydi"
	}
	return ""
}

func (s *Server) publicBase(ctx context.Context) string {
	v, _ := s.Core.St.Setting(ctx, "public_base_url")
	if v == "" {
		v = s.Cfg.Web.PublicBaseURL
	}
	return strings.TrimRight(strings.TrimSpace(v), "/")
}

func qrRows(text string) (int, []string, error) {
	q, err := qrcode.New(text, qrcode.Medium)
	if err != nil {
		return 0, nil, err
	}
	bm := q.Bitmap() // includes the quiet zone
	rows := make([]string, len(bm))
	for i, row := range bm {
		var b strings.Builder
		for _, on := range row {
			if on {
				b.WriteByte('1')
			} else {
				b.WriteByte('0')
			}
		}
		rows[i] = b.String()
	}
	return len(bm), rows, nil
}

func safeFileName(name string, id int64) string {
	var b strings.Builder
	for _, r := range strings.ToLower(name) {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == ' ' || r == '-' || r == '_':
			b.WriteByte('-')
		}
		if b.Len() >= 40 {
			break
		}
	}
	n := strings.Trim(b.String(), "-")
	if n == "" {
		n = "havola"
	}
	return "dronstream-" + n + "-" + strconv.FormatInt(id, 10) + ".png" // never contains the token
}

func (s *Server) shareInfo(r *http.Request, l *core.Link, tok string) shareOut {
	out := shareOut{Title: l.Name, EndsAt: l.EndsAt, FileName: safeFileName(l.Name, l.ID)}
	base := s.publicBase(r.Context())
	if p := BaseURLProblem(base); p != "" {
		out.Problem = p
		return out
	}
	// The token travels in the URL fragment: browsers never send it to the
	// server, it is not logged and not leaked in Referer; GET previews of the
	// page therefore cannot consume the link.
	out.URL = base + "/link#" + tok
	size, rows, err := qrRows(out.URL)
	if err == nil {
		out.QRSize, out.QRRows = size, rows
	}
	return out
}

func (s *Server) adminLoginShare(w http.ResponseWriter, r *http.Request) {
	base := s.publicBase(r.Context())
	if p := BaseURLProblem(base); p != "" {
		writeJSON(w, 200, shareOut{Problem: p, Title: "DronStream kirish", FileName: "dronstream-kirish.png"})
		return
	}
	size, rows, _ := qrRows(base + "/")
	writeJSON(w, 200, shareOut{URL: base + "/", QRSize: size, QRRows: rows, Title: "DronStream kirish", FileName: "dronstream-kirish.png"})
}

func (s *Server) adminGetSettings(w http.ResponseWriter, r *http.Request) {
	base := s.publicBase(r.Context())
	st, _ := s.Core.State(r.Context())
	writeJSON(w, 200, map[string]any{"publicBaseUrl": base, "publicBaseUrlProblem": BaseURLProblem(base), "guestEnabled": st.GuestEnabled, "guestDefaultMinutes": st.GuestMinutes,
		"maxImageMb": s.Cfg.Library.MaxImageMB, "maxVideoMb": s.Cfg.Library.MaxVideoMB, "timeZone": "Asia/Tashkent"})
}

func (s *Server) adminSetBaseURL(w http.ResponseWriter, r *http.Request) {
	var in struct{ URL string }
	if err := readJSON(r, &in); err != nil {
		writeErr(w, err)
		return
	}
	u := strings.TrimRight(strings.TrimSpace(in.URL), "/")
	if p := BaseURLProblem(u); p != "" {
		writeErr(w, &core.Error{Status: 400, Code: "bad_base_url", Msg: p})
		return
	}
	if err := s.Core.St.SetSetting(r.Context(), "public_base_url", u); err != nil {
		writeErr(w, err)
		return
	}
	s.Core.Audit(r.Context(), actor(r), "settings_public_url", u, nil)
	ok(w)
}

var _ = time.Second
