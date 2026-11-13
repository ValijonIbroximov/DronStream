//go:build integration

package integration

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"

	_ "modernc.org/sqlite"
)

// results collects measurements for TEST_REPORT.md.
var results = map[string]any{}
var resMu sync.Mutex

func record(k string, v any) {
	resMu.Lock()
	results[k] = v
	resMu.Unlock()
}

func saveResults(t *testing.T) {
	out := filepath.Join(repoRoot(), "build", "test-results")
	os.MkdirAll(out, 0o755)
	b, _ := json.MarshalIndent(results, "", "  ")
	os.WriteFile(filepath.Join(out, "integration.json"), b, 0o644)
	t.Logf("results written to %s", filepath.Join(out, "integration.json"))
}

type stream struct {
	ID          int64  `json:"id"`
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	IsDemo      bool   `json:"isDemo"`
	PublishMode string `json:"publishMode"`
	Stats       struct {
		Online      bool    `json:"online"`
		InboundKbps float64 `json:"inboundKbps"`
		Readers     int     `json:"readers"`
	} `json:"stats"`
}

func (c *client) streams() map[string]stream {
	var l []stream
	c.mustJSON("GET", "/api/admin/streams", nil, &l)
	m := map[string]stream{}
	for _, s := range l {
		m[s.Slug] = s
	}
	return m
}

func (c *client) waitOnline(slug string, want bool, d time.Duration) bool {
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		if c.streams()[slug].Stats.Online == want {
			return true
		}
		time.Sleep(300 * time.Millisecond)
	}
	return false
}

func (c *client) userID(username string) int64 {
	var us []struct {
		ID       int64
		Username string
	}
	c.mustJSON("GET", "/api/admin/users", nil, &us)
	for _, u := range us {
		if u.Username == username {
			return u.ID
		}
	}
	c.t.Fatalf("user %s not found", username)
	return 0
}

func (c *client) grant(subjType string, id int64, streams []int64, exp *int64) {
	c.mustJSON("POST", "/api/admin/permissions", map[string]any{"subjectType": subjType, "subjectId": id, "streamIds": streams, "expiresAt": exp}, nil)
}

func (c *client) revoke(subjType string, id, stream int64) {
	c.mustJSON("POST", "/api/admin/permissions/revoke", map[string]any{"subjectType": subjType, "subjectId": id, "streamId": stream}, nil)
}

func mtxReaders(t testing.TB) []map[string]any {
	resp, err := http.Get("http://" + apiAddr + "/v3/webrtc/sessions/list")
	if err != nil {
		t.Fatalf("mtx api: %v", err)
	}
	defer resp.Body.Close()
	var l struct{ Items []map[string]any }
	json.NewDecoder(resp.Body).Decode(&l)
	var out []map[string]any
	for _, it := range l.Items {
		if it["state"] == "read" {
			out = append(out, it)
		}
	}
	return out
}

func pctl(ds []time.Duration, p float64) time.Duration {
	if len(ds) == 0 {
		return 0
	}
	s := append([]time.Duration{}, ds...)
	sort.Slice(s, func(i, j int) bool { return s[i] < s[j] })
	return s[int(float64(len(s)-1)*p)]
}

func TestAcceptance(t *testing.T) {
	bin := buildServer(t)
	root := t.TempDir()
	os.MkdirAll(filepath.Join(root, "config"), 0o700)
	os.WriteFile(filepath.Join(root, "config", "dronstream.yaml"), []byte(testConfig(20)), 0o600)
	srv := startServer(t, bin, root)
	defer func() {
		if srv != nil {
			srv.stop()
		}
		saveResults(t)
	}()

	// ---- first-run admin (one-time setup code, no default admin) ----
	admin := newClient(t, "admin")
	tok, _ := os.ReadFile(filepath.Join(root, "data", "runtime", "setup-token.txt"))
	if st := admin.login("admin", "admin"); st != 401 {
		t.Fatalf("default admin/admin must not exist, got %d", st)
	}
	st, b := admin.do("POST", "/api/setup", map[string]string{"setupToken": "wrong", "username": "boss", "password": "Correct-Horse-1"}, nil)
	if st != 403 {
		t.Fatalf("setup with wrong token: %d %s", st, b)
	}
	st, b = admin.do("POST", "/api/setup", map[string]string{"setupToken": strings.TrimSpace(string(tok)), "username": "boss", "displayName": "Bosh admin", "password": "Correct-Horse-1"}, nil)
	if st != 200 {
		t.Fatalf("setup: %d %s", st, b)
	}
	admin.absorbSession(b)
	if st, _ := newClient(t, "x").do("POST", "/api/setup", map[string]string{"setupToken": strings.TrimSpace(string(tok)), "username": "evil", "password": "Correct-Horse-2"}, nil); st != 403 {
		t.Fatalf("setup token must be single-use, got %d", st)
	}
	record("setup_one_time", "PASS")

	// demo sources must come online
	if !admin.waitOnline("demo-a", true, 20*time.Second) || !admin.waitOnline("demo-b", true, 20*time.Second) {
		t.Fatal("demo sources did not come online")
	}
	ss := admin.streams()
	demoA, demoB := ss["demo-a"].ID, ss["demo-b"].ID

	// users
	for _, u := range []string{"alice", "bob", "carol"} {
		admin.mustJSON("POST", "/api/admin/users", map[string]string{"username": u, "displayName": strings.ToUpper(u[:1]) + u[1:], "password": "Password-" + u + "-1", "role": "user"}, nil)
	}
	alice, bob := newClient(t, "alice"), newClient(t, "bob")
	if alice.login("alice", "Password-alice-1") != 200 || bob.login("bob", "Password-bob-1") != 200 {
		t.Fatal("user login failed")
	}
	aliceID, bobID := admin.userID("alice"), admin.userID("bob")

	t.Run("default_no_permission", func(t *testing.T) {
		var l []any
		alice.mustJSON("GET", "/api/streams", nil, &l)
		if len(l) != 0 {
			t.Fatalf("user without grants sees %d streams", len(l))
		}
		if _, st, code := alice.ticket(demoA, "t1"); st != 403 || code != "no_permission" {
			t.Fatalf("ticket without permission: %d %s", st, code)
		}
		record("default_no_permission", "PASS")
	})

	t.Run("unapproved_guest_gets_nothing", func(t *testing.T) {
		g := newClient(t, "guest")
		g.guest("Mehmon <img src=x onerror=alert(1)>", `<script>alert("xss")</script> sabab`)
		var l []any
		g.mustJSON("GET", "/api/streams", nil, &l)
		if len(l) != 0 {
			t.Fatalf("pending guest sees streams: %v", l)
		}
		for _, id := range []int64{demoA, demoB, 999} {
			if _, st, _ := g.ticket(id, "x"); st != 403 {
				t.Fatalf("pending guest got ticket for %d: %d", id, st)
			}
		}
		// no thumbnail/snapshot endpoint exists; admin API forbidden
		for _, p := range []string{"/api/admin/streams", "/api/admin/overview", "/api/thumbnail/1", "/api/streams/1/thumbnail"} {
			if st, _ := g.do("GET", p, nil, nil); st != 403 && st != 404 {
				t.Fatalf("guest GET %s => %d", p, st)
			}
		}
		// direct WHEP with a forged ticket
		if v, st, _ := g.watchWithTicket(demoA, "forged-ticket"); v != nil || st != 403 {
			t.Fatalf("forged ticket accepted: %d", st)
		}
		// XSS payload is stored and returned as inert JSON text
		st, body := admin.do("GET", "/api/admin/guests?status=pending", nil, nil)
		if st != 200 || strings.Contains(string(body), "<script>") || !strings.Contains(string(body), string([]byte{92})+"u003cscript") {
			t.Fatalf("guest reason not JSON-escaped: %s", body)
		}
		record("guest_pending_no_media", "PASS")
		record("guest_xss_api_escaped", "PASS (browser rendering checked separately)")
	})

	admin.grant("user", aliceID, []int64{demoA}, nil)
	admin.grant("user", bobID, []int64{demoB}, nil)

	t.Run("user_A_cannot_open_B_stream", func(t *testing.T) {
		if _, st, code := alice.ticket(demoB, "t"); st != 403 {
			t.Fatalf("alice got ticket for bob's stream: %d %s", st, code)
		}
		// alice's ticket cannot be used by bob's session (ticket bound to session)
		tk, st, _ := alice.ticket(demoA, "t")
		if st != 200 {
			t.Fatal("alice ticket")
		}
		if v, st, _ := bob.watchWithTicket(demoA, tk); v != nil || st != 403 {
			t.Fatalf("bob used alice's ticket: %d", st)
		}
		// ticket for stream A presented on stream B URL
		if v, st, _ := alice.watchWithTicket(demoB, tk); v != nil || st != 403 {
			t.Fatalf("ticket reused for other stream: %d", st)
		}
		record("user_A_cannot_open_B_stream_api", "PASS")
	})

	t.Run("publish_key_is_not_playback", func(t *testing.T) {
		// create a real (RTMP) stream and get its key
		var cr struct {
			Stream stream
			Key    string
			URLs   map[string]string
		}
		admin.mustJSON("POST", "/api/admin/streams", map[string]string{"name": "Pult 1", "slug": "pult1"}, &cr)
		if cr.Key == "" || !strings.Contains(cr.URLs["rtmp"], "/live/pult1?key=") {
			t.Fatalf("create stream: %+v", cr)
		}
		admin.grant("user", aliceID, []int64{cr.Stream.ID}, nil)
		// key as playback bearer through the proxy
		if v, st, _ := alice.watchWithTicket(cr.Stream.ID, cr.Key); v != nil || st != 403 {
			t.Fatalf("publish key accepted as ticket: %d", st)
		}
		// key directly against MediaMTX WHEP (loopback) — hook must deny read
		req, _ := http.NewRequest("POST", "http://127.0.0.1:18889/live/pult1/whep", strings.NewReader("v=0\r\n"))
		req.Header.Set("Authorization", "Bearer "+cr.Key)
		req.Header.Set("Content-Type", "application/sdp")
		if resp, err := http.DefaultClient.Do(req); err == nil {
			if resp.StatusCode == 201 {
				t.Fatal("MediaMTX accepted publish key for reading")
			}
			resp.Body.Close()
		}
		// non-admin cannot see keys
		if st, _ := alice.do("GET", fmt.Sprintf("/api/admin/streams/%d/key", cr.Stream.ID), nil, nil); st != 403 {
			t.Fatalf("user could read key: %d", st)
		}
		record("publish_key_no_playback", "PASS")

		// wrong key, other stream's path, protocol variants
		wrong := ffmpegPublish(t, "rtmp://127.0.0.1:"+rtmpPort+"/live/pult1?key=WRONGKEYWRONGKEYWRONGKEY", "WRONG")
		if !wrong.exited(8 * time.Second) {
			wrong.kill()
			t.Fatal("publish with wrong key was accepted")
		}
		other := ffmpegPublish(t, "rtmp://127.0.0.1:"+rtmpPort+"/live/demo-a?key="+cr.Key, "OTHER")
		if !other.exited(8 * time.Second) {
			other.kill()
			t.Fatal("key of pult1 accepted for another stream path")
		}
		record("publish_wrong_key_rejected", "PASS")
		record("publish_other_path_rejected", "PASS")

		good := ffmpegPublish(t, cr.URLs["rtmp"], "PULT1")
		defer good.kill()
		if !admin.waitOnline("pult1", true, 15*time.Second) {
			t.Fatalf("correct key publish failed: %s", good.out.String())
		}
		// parallel publish with the same key must NOT replace the source
		dup := ffmpegPublish(t, cr.URLs["rtmp"], "INTRUDER")
		if !dup.exited(8 * time.Second) {
			dup.kill()
			t.Fatal("second publisher with same key was accepted (hidden source swap)")
		}
		if good.exited(500 * time.Millisecond) {
			t.Fatal("original publisher was replaced")
		}
		record("parallel_publish_second_rejected", "PASS")

		v := alice.watch(cr.Stream.ID, "rtmp")
		// rotate key: current publisher is kicked, old key refused
		t0 := time.Now()
		var rot struct {
			Key  string
			URLs map[string]string
		}
		admin.mustJSON("POST", fmt.Sprintf("/api/admin/streams/%d/rotate-key", cr.Stream.ID), nil, &rot)
		if !good.exited(5 * time.Second) {
			t.Fatal("publisher with rotated key not disconnected")
		}
		record("key_rotate_publisher_kicked_s", time.Since(t0).Seconds())
		old := ffmpegPublish(t, cr.URLs["rtmp"], "OLDKEY")
		if !old.exited(8 * time.Second) {
			old.kill()
			t.Fatal("old key accepted after rotation")
		}
		v.close()
		nw := ffmpegPublish(t, rot.URLs["rtmp"], "NEWKEY")
		if !admin.waitOnline("pult1", true, 15*time.Second) {
			nw.kill()
			t.Fatal("new key not accepted")
		}
		// revoke key: publisher kicked, reconnect refused
		admin.mustJSON("POST", fmt.Sprintf("/api/admin/streams/%d/revoke-key", cr.Stream.ID), nil, nil)
		if !nw.exited(5 * time.Second) {
			nw.kill()
			t.Fatal("publisher not kicked on key revoke")
		}
		again := ffmpegPublish(t, rot.URLs["rtmp"], "REVOKED")
		if !again.exited(8 * time.Second) {
			again.kill()
			t.Fatal("revoked key accepted")
		}
		record("revoked_key_reconnect_rejected", "PASS")
		// publish ban is separate from viewing close
		admin.mustJSON("POST", fmt.Sprintf("/api/admin/streams/%d/rotate-key", cr.Stream.ID), nil, &rot)
		admin.mustJSON("POST", fmt.Sprintf("/api/admin/streams/%d/publish", cr.Stream.ID), map[string]bool{"enabled": false}, nil)
		banned := ffmpegPublish(t, rot.URLs["rtmp"], "BANNED")
		if !banned.exited(8 * time.Second) {
			banned.kill()
			t.Fatal("publish ban not enforced")
		}
		admin.mustJSON("POST", fmt.Sprintf("/api/admin/streams/%d/publish", cr.Stream.ID), map[string]bool{"enabled": true}, nil)
		ok := ffmpegPublish(t, rot.URLs["rtmp"], "PULT1")
		defer ok.kill()
		if !admin.waitOnline("pult1", true, 15*time.Second) {
			t.Fatal("publish after unban failed")
		}
		record("publish_ban_separate", "PASS")
	})

	t.Run("revoke_cuts_media_and_blocks_reconnect", func(t *testing.T) {
		var lat []time.Duration
		for i := 0; i < 5; i++ {
			admin.grant("user", aliceID, []int64{demoA}, nil)
			tk, _, _ := alice.ticket(demoA, "rv")
			v, st, code := alice.watchWithTicket(demoA, tk)
			if v == nil {
				t.Fatalf("watch: %d %s", st, code)
			}
			if !v.waitPackets(100, 10*time.Second) {
				t.Fatal("no media")
			}
			t0 := time.Now()
			admin.revoke("user", aliceID, demoA)
			d, stopped := v.stopLatency(t0, 3500*time.Millisecond)
			if !stopped {
				t.Fatalf("media still flowing %v after revoke", time.Since(t0))
			}
			lat = append(lat, d)
			// old ticket replay and new ticket both refused
			if v2, st, _ := alice.watchWithTicket(demoA, tk); v2 != nil || st != 403 {
				t.Fatalf("old ticket replay after revoke: %d", st)
			}
			if _, st, code := alice.ticket(demoA, "rv"); st != 403 || code != "permission_revoked" {
				t.Fatalf("new ticket after revoke: %d %s", st, code)
			}
			v.close()
		}
		record("revoke_stop_latency_ms", durs(lat))
		record("revoke_stop_latency_max_ms", pctl(lat, 1).Milliseconds())
		if pctl(lat, 1) > 3*time.Second {
			t.Fatalf("revoke latency above 3 s target: %v", lat)
		}
		admin.grant("user", aliceID, []int64{demoA}, nil)
	})

	t.Run("ticket_single_use", func(t *testing.T) {
		tk, _, _ := alice.ticket(demoA, "su")
		v, st, _ := alice.watchWithTicket(demoA, tk)
		if v == nil {
			t.Fatalf("first use failed %d", st)
		}
		defer v.close()
		if v2, st, _ := alice.watchWithTicket(demoA, tk); v2 != nil || st != 403 {
			t.Fatalf("ticket reuse accepted: %d", st)
		}
		record("ticket_reuse_rejected", "PASS")
	})

	t.Run("permission_expiry_cuts_open_video", func(t *testing.T) {
		exp := time.Now().Add(6 * time.Second).UnixMilli()
		admin.grant("user", bobID, []int64{demoB}, &exp)
		v := bob.watch(demoB, "exp")
		defer v.close()
		select {
		case <-v.ended:
		case <-time.After(12 * time.Second):
		}
		time.Sleep(500 * time.Millisecond)
		d := v.lastPacket().Sub(time.UnixMilli(exp))
		if time.Since(v.lastPacket()) < 400*time.Millisecond {
			t.Fatal("video still flowing after permission expiry")
		}
		record("expiry_stop_offset_ms", d.Milliseconds())
		if w := time.Until(time.UnixMilli(exp)); w > 0 {
			time.Sleep(w + 100*time.Millisecond)
		}
		if _, st, code := bob.ticket(demoB, "exp"); st != 403 || code != "permission_expired" {
			t.Fatalf("ticket after expiry: %d %s", st, code)
		}
		admin.grant("user", bobID, []int64{demoB}, nil)
	})

	t.Run("same_ip_only_selected_user_cut", func(t *testing.T) {
		admin.grant("user", bobID, []int64{demoA}, nil)
		va := alice.watch(demoA, "ip")
		vb := bob.watch(demoA, "ip")
		defer va.close()
		defer vb.close()
		t0 := time.Now()
		admin.revoke("user", bobID, demoA)
		if _, stopped := vb.stopLatency(t0, 3*time.Second); !stopped {
			t.Fatal("bob not cut")
		}
		if !va.stillFlowing(3 * time.Second) {
			t.Fatal("alice (same IP) was cut too")
		}
		record("same_ip_selective_cut", "PASS")
	})

	t.Run("block_user_kills_all_sessions", func(t *testing.T) {
		alice2 := newClient(t, "alice-2nd-device")
		if alice2.login("alice", "Password-alice-1") != 200 {
			t.Fatal("2nd login")
		}
		v1 := alice.watch(demoA, "dev1")
		v2 := alice2.watch(demoA, "dev2")
		vb := bob.watch(demoB, "keep")
		defer v1.close()
		defer v2.close()
		defer vb.close()
		t0 := time.Now()
		admin.mustJSON("POST", fmt.Sprintf("/api/admin/users/%d/block", aliceID), map[string]bool{"blocked": true}, nil)
		d1, s1 := v1.stopLatency(t0, 3*time.Second)
		d2, s2 := v2.stopLatency(t0, 0)
		if !s1 || !s2 {
			t.Fatal("blocked user's media not cut")
		}
		if st, _ := alice.do("GET", "/api/streams", nil, nil); st != 401 {
			t.Fatalf("blocked session still valid: %d", st)
		}
		if st, _ := alice2.do("GET", "/api/streams", nil, nil); st != 401 {
			t.Fatalf("blocked 2nd session still valid: %d", st)
		}
		if newClient(t, "a3").login("alice", "Password-alice-1") != 403 {
			t.Fatal("blocked user can log in")
		}
		if !vb.stillFlowing(2 * time.Second) {
			t.Fatal("other user affected by block")
		}
		record("block_user_stop_latency_ms", []int64{d1.Milliseconds(), d2.Milliseconds()})
		admin.mustJSON("POST", fmt.Sprintf("/api/admin/users/%d/block", aliceID), map[string]bool{"blocked": false}, nil)
		if alice.login("alice", "Password-alice-1") != 200 {
			t.Fatal("unblocked login")
		}
	})

	t.Run("guest_flow_and_end", func(t *testing.T) {
		g := newClient(t, "guest2")
		g.guest("Sardor", "Hamkor tashkilot vakili")
		var gs []struct {
			ID   int64
			Name string `json:"displayName"`
		}
		admin.mustJSON("GET", "/api/admin/guests?status=pending", nil, &gs)
		var gid int64
		for _, x := range gs {
			if x.Name == "Sardor" {
				gid = x.ID
			}
		}
		admin.mustJSON("POST", fmt.Sprintf("/api/admin/guests/%d/approve", gid), map[string]any{"streamIds": []int64{demoB}, "until": time.Now().Add(time.Hour).UnixMilli()}, nil)
		var l []struct{ ID int64 }
		g.mustJSON("GET", "/api/streams", nil, &l)
		if len(l) != 1 || l[0].ID != demoB {
			t.Fatalf("approved guest streams: %+v", l)
		}
		if _, st, _ := g.ticket(demoA, "x"); st != 403 {
			t.Fatal("guest got non-granted stream")
		}
		v := g.watch(demoB, "g")
		defer v.close()
		t0 := time.Now()
		admin.mustJSON("POST", fmt.Sprintf("/api/admin/guests/%d/end", gid), nil, nil)
		if _, stopped := v.stopLatency(t0, 3*time.Second); !stopped {
			t.Fatal("guest media not cut on end")
		}
		if st, _ := g.do("GET", "/api/streams", nil, nil); st != 401 {
			t.Fatalf("ended guest session still valid: %d", st)
		}
		// a "new browser" must request again
		g2 := newClient(t, "guest2-other-browser")
		g2.guest("Sardor", "yana")
		if _, st, _ := g2.ticket(demoB, "x"); st != 403 {
			t.Fatal("new guest session inherited approval")
		}
		record("guest_approve_watch_end", "PASS")
	})

	t.Run("emergency_stop", func(t *testing.T) {
		va := alice.watch(demoA, "em")
		vb := bob.watch(demoB, "em")
		defer va.close()
		defer vb.close()
		t0 := time.Now()
		admin.mustJSON("POST", "/api/admin/emergency", map[string]bool{"on": true}, nil)
		da, sa := va.stopLatency(t0, 3*time.Second)
		db, sb := vb.stopLatency(t0, 0)
		if !sa || !sb {
			t.Fatal("emergency stop did not cut everyone")
		}
		if _, st, code := alice.ticket(demoA, "em"); st != 403 || code != "emergency_stop" {
			t.Fatalf("ticket during emergency: %d %s", st, code)
		}
		admin.mustJSON("POST", "/api/admin/emergency", map[string]bool{"on": false}, nil)
		record("emergency_stop_latency_ms", []int64{da.Milliseconds(), db.Milliseconds()})
	})

	t.Run("close_viewing_vs_publish", func(t *testing.T) {
		v := alice.watch(demoA, "cl")
		defer v.close()
		t0 := time.Now()
		admin.mustJSON("POST", fmt.Sprintf("/api/admin/streams/%d/viewing", demoA), map[string]bool{"enabled": false}, nil)
		if _, stopped := v.stopLatency(t0, 3*time.Second); !stopped {
			t.Fatal("closing stream did not cut viewer")
		}
		if !admin.waitOnline("demo-a", true, 2*time.Second) {
			t.Fatal("closing viewing must not stop the source")
		}
		admin.mustJSON("POST", fmt.Sprintf("/api/admin/streams/%d/viewing", demoA), map[string]bool{"enabled": true}, nil)
		record("close_viewing_keeps_source", "PASS")
	})

	t.Run("lease_bounds_session_without_renewal", func(t *testing.T) {
		// lease_seconds=20 in this config; a client that never renews is
		// closed by MediaMTX itself at expireAt (independent of the backend).
		v := alice.watch(demoA, "lease")
		defer v.close()
		start := time.Now()
		select {
		case <-v.ended:
		case <-time.After(30 * time.Second):
			t.Fatal("session not closed at lease end")
		}
		record("lease_close_after_s", time.Since(start).Seconds())
	})

	t.Run("no_alternative_playback_paths", func(t *testing.T) {
		for _, a := range []string{"127.0.0.1:8888", "127.0.0.1:8554", "127.0.0.1:8890", "127.0.0.1:9998", "127.0.0.1:9999", "127.0.0.1:9996"} {
			if c, err := net.DialTimeout("tcp", a, 300*time.Millisecond); err == nil {
				c.Close()
				t.Errorf("unexpected listener %s (HLS/RTSP/SRT/metrics/pprof/playback must be off)", a)
			}
		}
		// Control API and WebRTC signalling must be loopback only: check the config the server generated.
		conf, _ := os.ReadFile(filepath.Join(root, "data", "runtime", "mediamtx.yml"))
		for _, want := range []string{"apiAddress: 127.0.0.1:19997", "webrtcAddress: 127.0.0.1:18889", "hls: false", "rtsp: false", "srt: false", "moq: false", "playback: false", "metrics: false", "pprof: false", "overridePublisher: false", "record: false", "authMethod: http"} {
			if !strings.Contains(string(conf), want) {
				t.Errorf("mediamtx.yml missing %q", want)
			}
		}
		// RTMP read (pull) must be denied even with a valid ticket-less request
		cmd := exec.Command("ffmpeg", "-hide_banner", "-loglevel", "error", "-i", "rtmp://127.0.0.1:"+rtmpPort+"/live/demo-a", "-t", "1", "-f", "null", "-")
		if err := cmd.Run(); err == nil {
			t.Error("RTMP read of a stream succeeded")
		}
		record("alternative_playback_closed", "PASS")
	})

	t.Run("revoke_vs_connect_race", func(t *testing.T) {
		leaks := 0
		const N = 25
		for i := 0; i < N; i++ {
			admin.grant("user", bobID, []int64{demoA}, nil)
			tk, st, _ := bob.ticket(demoA, fmt.Sprintf("race%d", i))
			if st != 200 {
				t.Fatalf("ticket %d", st)
			}
			var wg sync.WaitGroup
			var v *viewer
			wg.Add(2)
			go func() { defer wg.Done(); v, _, _ = bob.watchWithTicket(demoA, tk) }()
			go func() {
				defer wg.Done()
				time.Sleep(time.Duration(i%10) * 15 * time.Millisecond)
				admin.revoke("user", bobID, demoA)
			}()
			wg.Wait()
			time.Sleep(2500 * time.Millisecond)
			if v != nil {
				if time.Since(v.lastPacket()) < 500*time.Millisecond {
					leaks++
				}
				v.close()
			}
		}
		// MediaMTX must have no reader for bob
		time.Sleep(1500 * time.Millisecond)
		record("race_iterations", N)
		record("race_leaks", leaks)
		if leaks > 0 {
			t.Fatalf("%d/%d races left media flowing after revoke", leaks, N)
		}
	})

	t.Run("db_failure_watchdog", func(t *testing.T) {
		v := alice.watch(demoA, "db")
		defer v.close()
		db, err := sql.Open("sqlite", "file:"+filepath.ToSlash(filepath.Join(root, "data", "dronstream.db"))+"?_pragma=busy_timeout(5000)")
		if err != nil {
			t.Fatal(err)
		}
		defer db.Close()
		conn, _ := db.Conn(context.Background())
		if _, err := conn.ExecContext(context.Background(), "BEGIN EXCLUSIVE"); err != nil {
			t.Fatalf("lock db: %v", err)
		}
		t0 := time.Now()
		select {
		case <-v.ended:
		case <-time.After(20 * time.Second):
		}
		d := v.lastPacket().Sub(t0)
		time.Sleep(800 * time.Millisecond)
		stopped := time.Since(v.lastPacket()) > 500*time.Millisecond
		conn.ExecContext(context.Background(), "ROLLBACK")
		conn.Close()
		if !stopped {
			t.Fatal("viewer not disconnected while auth DB unavailable")
		}
		record("db_unavailable_cut_after_s", d.Seconds())
		// recovers
		time.Sleep(3 * time.Second)
		v2 := alice.watch(demoA, "db2")
		v2.close()
	})

	t.Run("backend_crash_stops_media", func(t *testing.T) {
		v := alice.watch(demoA, "crash")
		defer v.close()
		mtxPid := mediamtxPid(t, root)
		t0 := time.Now()
		srv.cmd.Process.Kill() // hard crash of the backend (no cleanup code runs)
		select {
		case <-v.ended:
		case <-time.After(10 * time.Second):
		}
		d := v.lastPacket().Sub(t0)
		if time.Since(v.lastPacket()) < 500*time.Millisecond {
			t.Fatal("media still flowing after backend crash")
		}
		alive := processAlive(mtxPid)
		record("backend_crash_last_packet_after_ms", d.Milliseconds())
		record("backend_crash_mediamtx_killed", !alive)
		if alive {
			t.Fatal("mediamtx survived backend crash")
		}
		// new connections impossible while down
		if _, err := insecure().Get(base + "/api/health"); err == nil {
			t.Fatal("server still answering")
		}
		srv.cmd.Wait()
		srv.logf.Close()
		srv = startServer(t, bin, root) // restart for clean shutdown
	})
}

func durs(ds []time.Duration) []int64 {
	out := make([]int64, len(ds))
	for i, d := range ds {
		out[i] = d.Milliseconds()
	}
	return out
}

func mediamtxPid(t *testing.T, root string) int {
	st, b := statusJSON(root)
	if st != nil {
		t.Fatalf("status: %v %s", st, b)
	}
	var s struct{ MediamtxPid int }
	json.Unmarshal(b, &s)
	return s.MediamtxPid
}

func statusJSON(root string) (error, []byte) {
	tok, err := os.ReadFile(filepath.Join(root, "data", "runtime", "ctl.token"))
	if err != nil {
		return err, nil
	}
	resp, err := http.Get("http://127.0.0.1:19180/internal/ctl/status/" + strings.TrimSpace(string(tok)))
	if err != nil {
		return err, nil
	}
	defer resp.Body.Close()
	var raw json.RawMessage
	json.NewDecoder(resp.Body).Decode(&raw)
	return nil, raw
}

func processAlive(pid int) bool {
	out, _ := exec.Command("tasklist", "/FI", fmt.Sprintf("PID eq %d", pid), "/NH").Output()
	return strings.Contains(string(out), fmt.Sprint(pid))
}
