//go:build integration

package integration

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func (c *client) upload(kind, title string, data []byte) (int, map[string]any) {
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	mw.WriteField("kind", kind)
	mw.WriteField("title", title)
	fw, _ := mw.CreateFormFile("file", "upload.bin")
	fw.Write(data)
	mw.Close()
	req, _ := http.NewRequest("POST", base+"/api/admin/contents/upload", &buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("X-DS-Request", "1")
	req.Header.Set("X-CSRF-Token", c.csrf)
	resp, err := c.http.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer resp.Body.Close()
	var m map[string]any
	json.NewDecoder(resp.Body).Decode(&m)
	return resp.StatusCode, m
}

// approve: the administrator approves exactly this browser's request,
// using the verification code that the visitor's screen shows.
func (c *client) approve(visitor *client) (int, string) {
	st, b := c.do("POST", fmt.Sprintf("/api/admin/approvals/%d/approve", visitor.sessID), map[string]string{"verifyCode": visitor.verifyCode}, nil)
	var e struct{ Code string }
	json.Unmarshal(b, &e)
	return st, e.Code
}

func (c *client) mustApprove(visitor *client) {
	c.t.Helper()
	if st, code := c.approve(visitor); st != 200 {
		c.t.Fatalf("approve %s: %d %s", visitor.name, st, code)
	}
}

func (c *client) activate(token, reqID string) (int, string) {
	st, b := c.do("POST", "/api/link/activate", map[string]string{"token": token, "requestId": reqID}, nil)
	if st == 200 {
		c.absorbSession(b)
	}
	var e struct{ Code string }
	json.Unmarshal(b, &e)
	return st, e.Code
}

type linkResp struct {
	Link struct {
		ID        int64
		UsesCount int64
	}
	Share struct {
		URL     string
		Problem string
		QRRows  []string
	}
}

func tokenOf(url string) string { return url[strings.Index(url, "#")+1:] }

func (c *client) linkUses(id int64) int64 {
	var ls []struct {
		ID        int64
		UsesCount int64
		Status    string
	}
	c.mustJSON("GET", "/api/admin/links", nil, &ls)
	for _, l := range ls {
		if l.ID == id {
			return l.UsesCount
		}
	}
	return -1
}

func pngBytes() []byte {
	m := image.NewRGBA(image.Rect(0, 0, 640, 480))
	for x := 0; x < 640; x++ {
		m.Set(x, x%480, color.RGBA{0, 200, 0, 255})
	}
	var b bytes.Buffer
	png.Encode(&b, m)
	return b.Bytes()
}

func makeVideo(t *testing.T, codec string, seconds int) []byte {
	out := filepath.Join(t.TempDir(), "v.mp4")
	args := []string{"-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", fmt.Sprintf("testsrc2=size=1280x720:rate=30:duration=%d", seconds), "-pix_fmt", "yuv420p"}
	if codec == "hevc" {
		args = append(args, "-c:v", "libx265", "-x265-params", "log-level=error")
	} else {
		args = append(args, "-c:v", "libx264", "-preset", "ultrafast", "-b:v", "8M", "-movflags", "+faststart")
	}
	if b, err := exec.Command("ffmpeg", append(args, out)...).CombinedOutput(); err != nil {
		t.Fatalf("ffmpeg: %v %s", err, b)
	}
	b, _ := os.ReadFile(out)
	return b
}

func TestLinksAndMedia(t *testing.T) {
	bin := buildServer(t)
	root := t.TempDir()
	os.MkdirAll(filepath.Join(root, "config"), 0o700)
	os.WriteFile(filepath.Join(root, "config", "dronstream.yaml"), []byte(testConfig(120)), 0o600)
	srv := startServer(t, bin, root)
	defer func() { srv.stop(); saveResults(t) }()
	admin := newClient(t, "admin")
	tok, _ := os.ReadFile(filepath.Join(root, "data", "runtime", "setup-token.txt"))
	_, b := admin.do("POST", "/api/setup", map[string]string{"setupToken": strings.TrimSpace(string(tok)), "username": "boss", "password": "Correct-Horse-1"}, nil)
	admin.absorbSession(b)
	admin.waitOnline("demo-a", true, 20*time.Second)

	// public base URL: localhost refused, external accepted
	if st, _ := admin.do("POST", "/api/admin/settings/base-url", map[string]string{"url": "https://localhost:18443"}, nil); st != 400 {
		t.Fatalf("localhost base url accepted: %d", st)
	}
	admin.mustJSON("POST", "/api/admin/settings/base-url", map[string]string{"url": "https://dronstream.test:18443"}, nil)

	// content: text, image, video; HEVC + SVG rejected
	var txt struct{ ID int64 }
	admin.mustJSON("POST", "/api/admin/contents/text", map[string]string{"title": "E'lon", "body": "<script>alert(1)</script> oddiy matn"}, &txt)
	st, img := admin.upload("image", "Xarita", pngBytes())
	if st != 200 {
		t.Fatalf("image upload %d %v", st, img)
	}
	imgID := int64(img["id"].(float64))
	video := makeVideo(t, "h264", 20) // ~20 MB
	st, vid := admin.upload("video", "Brifing videosi", video)
	if st != 200 {
		t.Fatalf("video upload %d %v", st, vid)
	}
	vidID := int64(vid["id"].(float64))
	if st, m := admin.upload("video", "hevc", makeVideo(t, "hevc", 1)); st != 400 || !strings.Contains(fmt.Sprint(m["message"]), "H.265") {
		t.Fatalf("HEVC not rejected: %d %v", st, m)
	}
	if st, _ := admin.upload("image", "svg", []byte(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>`)); st != 400 {
		t.Fatal("SVG accepted")
	}
	if st, _ := admin.upload("image", "html", []byte("<html><body>x</body></html>")); st != 400 {
		t.Fatal("HTML accepted")
	}
	record("upload_validation", "PASS (H.265, SVG, HTML rejected; PNG, H.264 MP4 accepted)")
	var demoContent int64
	var cs []struct {
		ID         int64
		StreamSlug string
	}
	admin.mustJSON("GET", "/api/admin/contents", nil, &cs)
	for _, c := range cs {
		if c.StreamSlug == "demo-a" {
			demoContent = c.ID
		}
	}

	objs := []map[string]any{{"type": "content", "id": txt.ID}, {"type": "content", "id": imgID}, {"type": "content", "id": vidID}, {"type": "content", "id": demoContent}}

	// ---- one-time link ----
	var once linkResp
	admin.mustJSON("POST", "/api/admin/links", map[string]any{"name": "Bir martalik test", "preset": "once", "sessionMinutes": 60, "objects": objs}, &once)
	if once.Share.Problem != "" || !strings.HasPrefix(once.Share.URL, "https://dronstream.test:18443/link#") || len(once.Share.QRRows) == 0 {
		t.Fatalf("share: %+v", once.Share)
	}
	token := tokenOf(once.Share.URL)
	// previews: GET of the page (as Telegram/scanners do), QR view, inspect
	for i := 0; i < 3; i++ {
		resp, err := insecure().Get(base + "/link")
		if err != nil || resp.StatusCode != 200 || resp.Header.Get("Cache-Control") != "no-store" || resp.Header.Get("Referrer-Policy") != "no-referrer" {
			t.Fatalf("GET /link: %v %v", err, resp)
		}
		resp.Body.Close()
		admin.mustJSON("GET", fmt.Sprintf("/api/admin/links/%d/share", once.Link.ID), nil, nil)
		newClient(t, "scanner").do("POST", "/api/link/inspect", map[string]string{"token": token}, nil)
	}
	if u := admin.linkUses(once.Link.ID); u != 0 {
		t.Fatalf("preview consumed uses: %d", u)
	}
	record("link_preview_get_qr_no_consume", "PASS")

	// parallel "Kirish" from 20 different browsers: only access REQUESTS are
	// created (at most 5 per link); none of them grants anything yet.
	var okN atomic.Int64
	var requesters []*client
	var wmu sync.Mutex
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			c := newClient(t, fmt.Sprintf("b%d", i))
			if st, _ := c.activate(token, fmt.Sprintf("parallel-browser-%04d", i)); st == 200 {
				okN.Add(1)
				wmu.Lock()
				requesters = append(requesters, c)
				wmu.Unlock()
			}
		}(i)
	}
	wg.Wait()
	if okN.Load() != 5 || admin.linkUses(once.Link.ID) != 0 {
		t.Fatalf("one-time link: %d requests (want 5), uses=%d (want 0)", okN.Load(), admin.linkUses(once.Link.ID))
	}
	record("once_link_parallel_20_requests_capped", okN.Load())
	// the link alone opens nothing: no ticket, no file, no library entry, no media
	pend := requesters[0]
	if _, st, code := pend.ticket(admin.streams()["demo-a"].ID, "x"); st != 403 || code != "link_pending_approval" {
		t.Fatalf("pending link session got a ticket: %d %s", st, code)
	}
	if st, _ := pend.do("GET", fmt.Sprintf("/api/content/%d/file", imgID), nil, nil); st != 403 {
		t.Fatalf("pending link session got a file: %d", st)
	}
	var pl struct{ Items []any }
	pend.mustJSON("GET", "/api/library", nil, &pl)
	if len(pl.Items) != 0 {
		t.Fatalf("pending link session sees %d library items", len(pl.Items))
	}
	record("link_alone_grants_nothing", "PASS (ticket 403 link_pending_approval, fayl 403, kutubxona bo'sh)")
	// a wrong verification code does not approve
	if st, code := admin.do("POST", fmt.Sprintf("/api/admin/approvals/%d/approve", pend.sessID), map[string]string{"verifyCode": "XXX-XXX"}, nil); st != 409 || !strings.Contains(string(code), "verify_code_mismatch") {
		t.Fatalf("wrong code approved: %d %s", st, code)
	}
	// two approvals at once for two different requests: exactly one wins
	var won atomic.Int64
	var winner *client
	for _, c := range requesters[:2] {
		wg.Add(1)
		go func(c *client) {
			defer wg.Done()
			if st, _ := admin.approve(c); st == 200 {
				won.Add(1)
				wmu.Lock()
				winner = c
				wmu.Unlock()
			}
		}(c)
	}
	wg.Wait()
	if won.Load() != 1 || admin.linkUses(once.Link.ID) != 1 {
		t.Fatalf("one-time link approved %d times, uses=%d", won.Load(), admin.linkUses(once.Link.ID))
	}
	record("once_link_parallel_approvals_one_winner", won.Load())
	if st, code := newClient(t, "late").activate(token, "late-browser-000001"); st != 403 || code != "link_used_up" {
		t.Fatalf("other browser after use: %d %s", st, code)
	}
	record("once_link_other_browser_rejected", "PASS")

	// retry of the same POST (lost response) does not consume again
	retry := newClient(t, "retry-src")
	var once2 linkResp
	admin.mustJSON("POST", "/api/admin/links", map[string]any{"name": "Retry", "preset": "once", "sessionMinutes": 60, "objects": objs}, &once2)
	t2 := tokenOf(once2.Share.URL)
	retry.activate(t2, "same-req-id-0000001")
	if st, _ := retry.activate(t2, "same-req-id-0000001"); st != 200 || admin.linkUses(once2.Link.ID) != 0 {
		t.Fatalf("retry: %d uses=%d", st, admin.linkUses(once2.Link.ID))
	}
	admin.mustApprove(retry)
	if admin.linkUses(once2.Link.ID) != 1 {
		t.Fatalf("retry then approval: uses=%d", admin.linkUses(once2.Link.ID))
	}
	record("activation_retry_not_double_counted", "PASS")

	// refresh / tabs / media reconnects on the winner's session
	for i := 0; i < 5; i++ {
		winner.mustJSON("GET", "/api/session", nil, nil)
		winner.mustJSON("GET", "/api/library", nil, nil)
	}
	v1 := winner.watch(admin.streams()["demo-a"].ID, "tabA")
	v2 := winner.watch(admin.streams()["demo-a"].ID, "tabB")
	v1.close()
	v3 := winner.watch(admin.streams()["demo-a"].ID, "tabA")
	if admin.linkUses(once.Link.ID) != 1 {
		t.Fatal("refresh/tab/media reconnect consumed a use")
	}
	record("refresh_tab_media_reconnect_no_consume", "PASS")

	// ---- media protection ----
	var lib struct {
		Items []struct {
			ID   int64
			Type string
			Body string
		}
	}
	winner.mustJSON("GET", "/api/library", nil, &lib)
	if len(lib.Items) != 4 {
		t.Fatalf("link library: %+v", lib.Items)
	}
	get := func(c *client, path string, hdr map[string]string) (int, int) {
		req, _ := http.NewRequest("GET", base+path, nil)
		for k, v := range hdr {
			req.Header.Set(k, v)
		}
		resp, err := c.http.Do(req)
		if err != nil {
			return 0, 0
		}
		defer resp.Body.Close()
		n, _ := io.Copy(io.Discard, resp.Body)
		return resp.StatusCode, int(n)
	}
	if st, n := get(winner, fmt.Sprintf("/api/content/%d/file", vidID), map[string]string{"Range": "bytes=1000-1999"}); st != 206 || n != 1000 {
		t.Fatalf("authorized range: %d %d", st, n)
	}
	other := newClient(t, "user-without-grant")
	admin.mustJSON("POST", "/api/admin/users", map[string]string{"username": "nogrant", "password": "Password-nogrant-1", "role": "user"}, nil)
	other.login("nogrant", "Password-nogrant-1")
	anon := newClient(t, "anon")
	for _, p := range []string{fmt.Sprintf("/api/content/%d/file", vidID), fmt.Sprintf("/api/content/%d/file", imgID), fmt.Sprintf("/api/content/%d/thumb", imgID)} {
		if st, _ := get(other, p, map[string]string{"Range": "bytes=0-99"}); st != 403 {
			t.Fatalf("no-grant user %s: %d", p, st)
		}
		if st, _ := get(anon, p, nil); st != 401 {
			t.Fatalf("anonymous %s: %d", p, st)
		}
	}
	for _, p := range []string{"/api/content/../../config/dronstream.yaml", "/api/content/1%2f..%2f/file", "/api/content/abc/file", "/data/dronstream.db", "/data/media/"} {
		req, _ := http.NewRequest("GET", base+p, nil)
		resp, err := winner.http.Do(req)
		if err != nil {
			continue
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if strings.Contains(string(body), "internal_listen") || strings.Contains(string(body), "SQLite format") || (resp.StatusCode == 200 && !strings.Contains(string(body), "<div id=\"root\">")) {
			t.Fatalf("path trick %s leaked data (%d)", p, resp.StatusCode)
		}
	}
	// hidden content: denied to the link session even with a grant
	f := false
	admin.mustJSON("PUT", fmt.Sprintf("/api/admin/contents/%d", imgID), map[string]any{"visible": &f}, nil)
	if st, _ := get(winner, fmt.Sprintf("/api/content/%d/thumb", imgID), nil); st != 403 {
		t.Fatalf("hidden thumb: %d", st)
	}
	tr := true
	admin.mustJSON("PUT", fmt.Sprintf("/api/admin/contents/%d", imgID), map[string]any{"visible": &tr}, nil)
	record("media_url_thumb_range_bypass_blocked", "PASS")

	// ---- revoke cuts an in-progress video download and the live stream ----
	req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/content/%d/file", base, vidID), nil)
	resp, err := winner.http.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	total := resp.ContentLength
	buf := make([]byte, 64<<10)
	got := int64(0)
	for i := 0; i < 5; i++ { // slow consumer
		n, _ := resp.Body.Read(buf)
		got += int64(n)
		time.Sleep(50 * time.Millisecond)
	}
	t0 := time.Now()
	admin.mustJSON("POST", fmt.Sprintf("/api/admin/links/%d/revoke", once.Link.ID), nil, nil)
	var readErr error
	for {
		n, err := resp.Body.Read(buf)
		got += int64(n)
		if err != nil {
			readErr = err
			break
		}
	}
	resp.Body.Close()
	cut := time.Since(t0)
	if readErr == io.EOF && got >= total {
		t.Fatalf("video download completed after revoke (%d/%d)", got, total)
	}
	record("revoke_cuts_video_download", fmt.Sprintf("PASS: stopped at %d of %d bytes, %d ms after revoke (socket buffers may still deliver up to a few hundred KB)", got, total, cut.Milliseconds()))
	d2, s2 := v2.stopLatency(t0, 2*time.Second)
	if !s2 {
		t.Fatal("live stream not cut on link revoke")
	}
	_ = v3
	record("link_revoke_live_stop_ms", d2.Milliseconds())
	if st, _ := get(winner, fmt.Sprintf("/api/content/%d/file", vidID), map[string]string{"Range": "bytes=0-10"}); st != 401 && st != 403 {
		t.Fatalf("range after revoke: %d", st)
	}

	// ---- expiry cuts open media (link end reached) ----
	var timed linkResp
	now := time.Now().UnixMilli()
	end := now + 6000
	admin.mustJSON("POST", "/api/admin/links", map[string]any{"name": "Vaqtinchalik", "preset": "timed", "startsAt": now - 1000, "endsAt": end, "maxParallel": 5, "sessionMinutes": 60, "objects": objs}, &timed)
	tc := newClient(t, "timed")
	if st, code := tc.activate(tokenOf(timed.Share.URL), "timed-browser-000001"); st != 200 {
		t.Fatalf("timed activate %d %s", st, code)
	}
	admin.mustApprove(tc)
	tv := tc.watch(admin.streams()["demo-a"].ID, "t")
	resp2, err := tc.http.Do(func() *http.Request {
		r, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/content/%d/file", base, vidID), nil)
		return r
	}())
	if err != nil {
		t.Fatal(err)
	}
	var vErr error
	vGot := int64(0)
	done := make(chan struct{})
	go func() {
		for {
			n, err := resp2.Body.Read(buf[:16<<10])
			vGot += int64(n)
			if err != nil {
				vErr = err
				break
			}
			time.Sleep(100 * time.Millisecond) // slow player
		}
		close(done)
	}()
	select {
	case <-tv.ended:
	case <-time.After(15 * time.Second):
	}
	<-done
	resp2.Body.Close()
	if time.Since(tv.lastPacket()) < 400*time.Millisecond {
		t.Fatal("live media continues after link end")
	}
	if vErr == io.EOF && vGot >= resp2.ContentLength {
		t.Fatal("video download outlived the link end")
	}
	record("link_expiry_cuts_live_offset_ms", tv.lastPacket().Sub(time.UnixMilli(end)).Milliseconds())
	record("link_expiry_cuts_video_download", fmt.Sprintf("PASS (%d of %d bytes)", vGot, resp2.ContentLength))

	// before start / after end
	var future linkResp
	admin.mustJSON("POST", "/api/admin/links", map[string]any{"name": "Kelajak", "preset": "timed", "startsAt": time.Now().Add(time.Hour).UnixMilli(), "endsAt": time.Now().Add(2 * time.Hour).UnixMilli(), "maxParallel": 2, "sessionMinutes": 60, "objects": objs}, &future)
	if st, code := newClient(t, "early").activate(tokenOf(future.Share.URL), "early-browser-00001"); st != 403 || code != "link_not_started" {
		t.Fatalf("before start: %d %s", st, code)
	}
	if st, code := newClient(t, "late2").activate(tokenOf(timed.Share.URL), "late-browser-000002"); st != 403 || code != "link_expired" {
		t.Fatalf("after end: %d %s", st, code)
	}
	record("timed_window_before_after_rejected", "PASS")

	// ---- N-limit under parallel HTTP ----
	var multi linkResp
	admin.mustJSON("POST", "/api/admin/links", map[string]any{"name": "3 marta", "preset": "multi", "maxUses": 3, "maxParallel": 50, "sessionMinutes": 30, "objects": objs}, &multi)
	var mreq []*client
	for i := 0; i < 15; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			c := newClient(t, "m")
			if st, _ := c.activate(tokenOf(multi.Share.URL), fmt.Sprintf("multi-browser-%05d", i)); st == 200 {
				wmu.Lock()
				mreq = append(mreq, c)
				wmu.Unlock()
			}
		}(i)
	}
	wg.Wait()
	var nOK atomic.Int64
	for _, c := range mreq {
		wg.Add(1)
		go func(c *client) {
			defer wg.Done()
			if st, _ := admin.approve(c); st == 200 {
				nOK.Add(1)
			}
		}(c)
	}
	wg.Wait()
	if len(mreq) != 5 || nOK.Load() != 3 || admin.linkUses(multi.Link.ID) != 3 {
		t.Fatalf("N=3 over HTTP: %d requests, %d approved, uses=%d", len(mreq), nOK.Load(), admin.linkUses(multi.Link.ID))
	}
	record("multi_link_n3_parallel_approvals", fmt.Sprintf("%d so'rov, %d tasdiq", len(mreq), nOK.Load()))
	// a copy of an approved multi link in yet another browser: a new request, nothing more
	copyc := newClient(t, "copy")
	if st, code := copyc.activate(tokenOf(multi.Share.URL), "copied-link-browser01"); st != 403 || code != "link_used_up" {
		t.Fatalf("copied used-up link: %d %s", st, code)
	}

	// ---- text visible to link session, disappears after revoke of grant ----
	var multiLib struct {
		Items []struct {
			ID   int64
			Body string
		}
	}
	mc := newClient(t, "mc")
	var multi2 linkResp
	admin.mustJSON("POST", "/api/admin/links", map[string]any{"name": "matn", "preset": "multi", "maxUses": 2, "maxParallel": 2, "sessionMinutes": 30, "objects": []map[string]any{{"type": "content", "id": txt.ID}}}, &multi2)
	mc.activate(tokenOf(multi2.Share.URL), "text-browser-000001")
	// copied link in another browser before approval: request only, sees nothing
	cp := newClient(t, "copied")
	if st, _ := cp.activate(tokenOf(multi2.Share.URL), "copied-browser-00001"); st != 200 {
		t.Fatalf("copied link request: %d", st)
	}
	var cpl struct{ Items []any }
	cp.mustJSON("GET", "/api/library", nil, &cpl)
	if len(cpl.Items) != 0 {
		t.Fatal("copied link sees content before approval")
	}
	admin.mustApprove(mc)
	cp.mustJSON("GET", "/api/library", nil, &cpl)
	if len(cpl.Items) != 0 {
		t.Fatal("approving one browser opened another browser's copy of the link")
	}
	record("copied_link_other_browser_no_access", "PASS (tasdiqlangan sessiya boshqa brauzerdagi nusxaga huquq bermadi)")
	mc.mustJSON("GET", "/api/library", nil, &multiLib)
	if len(multiLib.Items) != 1 || !strings.Contains(multiLib.Items[0].Body, "<script>") {
		t.Fatalf("text: %+v", multiLib.Items)
	}
	var gs []struct{ ID int64 }
	admin.mustJSON("GET", fmt.Sprintf("/api/admin/grants?subjectType=link&subjectId=%d", multi2.Link.ID), nil, &gs)
	admin.mustJSON("POST", fmt.Sprintf("/api/admin/grants/%d/revoke", gs[0].ID), nil, nil)
	mc.mustJSON("GET", "/api/library", nil, &multiLib)
	if len(multiLib.Items) != 0 {
		t.Fatal("text still listed after revoke")
	}
	record("text_removed_from_library_after_revoke", "PASS (API); UI removal checked in browser")

	// remember for backup test
	os.WriteFile(filepath.Join(root, "test-video.sha256"), []byte(fmt.Sprintf("%x", sha256.Sum256(video))), 0o600)

	// ---- backup -> restore into a clean root ----
	os.Setenv("DRONSTREAM_BACKUP_PASSPHRASE", "Integration-Backup-Pass-1")
	defer os.Unsetenv("DRONSTREAM_BACKUP_PASSPHRASE")
	bk := filepath.Join(t.TempDir(), "m.dsbak")
	if out, err := exec.Command(bin, "backup", "--root", root, "--out", bk).CombinedOutput(); err != nil {
		t.Fatalf("backup: %v %s", err, out)
	}
	usesBefore := admin.linkUses(once.Link.ID)
	srv.stop()
	root2 := t.TempDir()
	os.MkdirAll(filepath.Join(root2, "config"), 0o700)
	os.WriteFile(filepath.Join(root2, "config", "dronstream.yaml"), []byte(testConfig(120)), 0o600)
	if out, err := exec.Command(bin, "restore", "--root", root2, "--in", bk).CombinedOutput(); err != nil {
		t.Fatalf("restore: %v %s", err, out)
	}
	exec.Command(bin, "activate", "--root", root2).Run()
	srv = startServer(t, bin, root2)
	a2 := newClient(t, "admin2")
	if a2.login("boss", "Correct-Horse-1") != 200 {
		t.Fatal("admin login after restore")
	}
	if st, _ := winner.do("GET", "/api/library", nil, nil); st != 401 {
		t.Fatalf("old session valid after restore: %d", st)
	}
	if st, code := newClient(t, "after").activate(token, "after-restore-00001"); st != 403 || (code != "link_revoked" && code != "link_used_up") {
		t.Fatalf("used/revoked one-time link reopened after restore: %d %s", st, code)
	}
	if st, code := retry.activate(t2, "same-req-id-0000001"); st == 200 {
		t.Fatalf("old activation retry reopened link after restore: %s", code)
	}
	if u := a2.linkUses(once.Link.ID); u != usesBefore {
		t.Fatalf("uses counter after restore %d != %d", u, usesBefore)
	}
	var ls []struct {
		ID     int64
		Status string
	}
	a2.mustJSON("GET", "/api/admin/links", nil, &ls)
	for _, l := range ls {
		if l.ID == once.Link.ID && l.Status != "revoked" {
			t.Fatalf("revoked status lost: %s", l.Status)
		}
	}
	h := sha256.New()
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/api/content/%d/file", base, vidID), nil)
	resp3, err := a2.http.Do(req)
	if err != nil || resp3.StatusCode != 200 {
		t.Fatalf("media after restore: %v %v", err, resp3)
	}
	io.Copy(h, resp3.Body)
	resp3.Body.Close()
	if hex.EncodeToString(h.Sum(nil)) != fmt.Sprintf("%x", sha256.Sum256(video)) {
		t.Fatal("restored video differs")
	}
	record("backup_restore_media_links_counters", "PASS")
}
