//go:build integration

// Integration tests run the real dronstream.exe + MediaMTX v1.21.3, real
// demo (WHIP) and FFmpeg (RTMP) publishers, and real WebRTC viewers (pion)
// that connect through the HTTPS WHEP proxy exactly like a browser.
//
//	go test -tags integration -v -count=1 ./integration/
//
// Requirements: MediaMTX at DS_MEDIAMTX (default ../.tools/mediamtx/mediamtx.exe,
// on Linux ../.tools/mediamtx-linux/mediamtx)
// and ffmpeg on PATH.
package integration

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/pion/webrtc/v4"
)

const (
	webPort  = "18443"
	rtmpPort = "11935"
	apiAddr  = "127.0.0.1:19997"
)

type server struct {
	root, bin string
	logf      *os.File
	cmd       *exec.Cmd
	t         testing.TB
	stopped   atomic.Bool
}

func repoRoot() string {
	_, f, _, _ := runtime.Caller(0)
	return filepath.Dir(filepath.Dir(filepath.Dir(f)))
}

// The suite runs on Windows and on Linux; only file names differ.
func exeSuffix() string {
	if runtime.GOOS == "windows" {
		return ".exe"
	}
	return ""
}

func defaultMediaMTX() string {
	if runtime.GOOS == "windows" {
		return filepath.Join(repoRoot(), ".tools", "mediamtx", "mediamtx.exe")
	}
	return filepath.Join(repoRoot(), ".tools", "mediamtx-linux", "mediamtx")
}

func buildServer(t testing.TB) (bin string) {
	dir := t.TempDir()
	bin = filepath.Join(dir, "dronstream"+exeSuffix())
	embedFrontend(t)
	cmd := exec.Command("go", "build", "-o", bin, "./cmd/dronstream")
	cmd.Dir = filepath.Join(repoRoot(), "backend")
	cmd.Env = append(os.Environ(), "CGO_ENABLED=0")
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("build: %v\n%s", err, out)
	}
	mtxSrc := os.Getenv("DS_MEDIAMTX")
	if mtxSrc == "" {
		mtxSrc = defaultMediaMTX()
	}
	os.MkdirAll(filepath.Join(dir, "mediamtx"), 0o755)
	b, err := os.ReadFile(mtxSrc)
	if err != nil {
		t.Fatalf("mediamtx binary: %v", err)
	}
	os.WriteFile(filepath.Join(dir, "mediamtx", "mediamtx"+exeSuffix()), b, 0o755)
	return bin
}

// maxPerSubject is the per-subject player limit written into the test config.
var maxPerSubject = 12

func testConfig(lease int) string {
	return fmt.Sprintf(`web:
  listen: "127.0.0.1:%s"
  internal_listen: "127.0.0.1:19180"
  public_hosts: [localhost]
media:
  api_listen: "%s"
  webrtc_http_listen: "127.0.0.1:18889"
  webrtc_udp_listen: "127.0.0.1:18189"
  webrtc_ips_from_interfaces: false
  rtmp_listen: "127.0.0.1:%s"
  publish_host: "127.0.0.1"
  lease_seconds: %d
  ticket_ttl_seconds: 30
  max_media_sessions_per_subject: %d
  reconcile_interval_ms: 1000
security:
  audit_retention_days: 30
  link_rate_per_minute: 100000
logging:
  level: debug
demo:
  enabled: true
`, webPort, apiAddr, rtmpPort, lease, maxPerSubject)
}

func startServer(t testing.TB, bin, root string) *server {
	s := &server{root: root, bin: bin, t: t}
	logf, _ := os.Create(filepath.Join(root, "console.log"))
	s.logf = logf
	s.cmd = exec.Command(bin, "run", "--root", root)
	s.cmd.Stdout, s.cmd.Stderr = logf, logf
	if err := s.cmd.Start(); err != nil {
		t.Fatal(err)
	}
	// A failed test must not leave its server on the shared test ports: the
	// next test would talk to it and fail for an unrelated reason.
	t.Cleanup(s.stop)
	deadline := time.Now().Add(20 * time.Second)
	for time.Now().Before(deadline) {
		resp, err := insecure().Get("https://127.0.0.1:" + webPort + "/api/health")
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == 200 {
				return s
			}
		}
		time.Sleep(200 * time.Millisecond)
	}
	b, _ := os.ReadFile(filepath.Join(root, "console.log"))
	t.Fatalf("server did not become healthy:\n%s", b)
	return nil
}

func (s *server) stop() {
	if !s.stopped.CompareAndSwap(false, true) {
		return
	}
	exec.Command(s.bin, "stop", "--root", s.root).Run()
	done := make(chan struct{})
	go func() { s.cmd.Wait(); close(done) }()
	select {
	case <-done:
	case <-time.After(10 * time.Second):
		s.cmd.Process.Kill()
	}
	s.logf.Close()
}

func insecure() *http.Client {
	return &http.Client{Timeout: 20 * time.Second, Transport: &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}}
}

// ---- API client (behaves like the browser: cookie + CSRF + custom header) ----

type client struct {
	t    testing.TB
	http *http.Client
	csrf string
	name string
	// the browser session the server reported last (id, verification code)
	sessID     int64
	verifyCode string
}

func newClient(t testing.TB, name string) *client {
	jar, _ := cookiejar.New(nil)
	h := insecure()
	h.Jar = jar
	return &client{t: t, http: h, name: name}
}

const base = "https://127.0.0.1:" + webPort

func (c *client) do(method, path string, body any, hdr map[string]string) (int, []byte) {
	var rd io.Reader
	if s, ok := body.(string); ok {
		rd = strings.NewReader(s)
	} else if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, base+path, rd)
	req.Header.Set("X-DS-Request", "1")
	req.Header.Set("Content-Type", "application/json")
	if c.csrf != "" {
		req.Header.Set("X-CSRF-Token", c.csrf)
	}
	for k, v := range hdr {
		req.Header.Set(k, v)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		c.t.Fatalf("%s %s: %v", method, path, err)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, b
}

func (c *client) mustJSON(method, path string, body any, out any) {
	c.t.Helper()
	st, b := c.do(method, path, body, nil)
	if st/100 != 2 {
		c.t.Fatalf("%s %s => %d %s", method, path, st, b)
	}
	if out != nil {
		json.Unmarshal(b, out)
	}
}

func (c *client) absorbSession(b []byte) {
	var s struct {
		CSRF    string
		Session struct {
			ID         int64
			VerifyCode string
		}
	}
	json.Unmarshal(b, &s)
	c.csrf = s.CSRF
	c.sessID, c.verifyCode = s.Session.ID, s.Session.VerifyCode
}

func (c *client) login(user, pass string) int {
	st, b := c.do("POST", "/api/login", map[string]string{"username": user, "password": pass}, nil)
	if st == 200 {
		c.absorbSession(b)
	}
	return st
}

func (c *client) guest(name, reason string) {
	st, b := c.do("POST", "/api/guest", map[string]string{"name": name, "reason": reason}, nil)
	if st != 200 {
		c.t.Fatalf("guest: %d %s", st, b)
	}
	c.absorbSession(b)
}

func (c *client) ticket(streamID int64, tab string) (string, int, string) {
	st, b := c.do("POST", fmt.Sprintf("/api/watch/%d/ticket", streamID), map[string]string{"tab": tab}, nil)
	var out struct {
		Ticket string
		Code   string
	}
	json.Unmarshal(b, &out)
	return out.Ticket, st, out.Code
}

// ---- WebRTC viewer through the WHEP proxy ----

type viewer struct {
	pc       *webrtc.PeerConnection
	packets  atomic.Int64
	last     atomic.Int64
	ended    chan struct{}
	resource string
}

func (v *viewer) close() { v.pc.Close() }

func (v *viewer) lastPacket() time.Time { return time.Unix(0, v.last.Load()) }

// watch opens a real WebRTC session; returns the HTTP status of the WHEP POST.
func (c *client) watchWithTicket(streamID int64, ticket string) (*viewer, int, string) {
	se := webrtc.SettingEngine{}
	se.SetIncludeLoopbackCandidate(true)
	se.SetNetworkTypes([]webrtc.NetworkType{webrtc.NetworkTypeUDP4})
	pc, err := webrtc.NewAPI(webrtc.WithSettingEngine(se)).NewPeerConnection(webrtc.Configuration{})
	if err != nil {
		c.t.Fatal(err)
	}
	v := &viewer{pc: pc, ended: make(chan struct{})}
	pc.AddTransceiverFromKind(webrtc.RTPCodecTypeVideo, webrtc.RTPTransceiverInit{Direction: webrtc.RTPTransceiverDirectionRecvonly})
	var once atomic.Bool
	pc.OnTrack(func(tr *webrtc.TrackRemote, _ *webrtc.RTPReceiver) {
		for {
			if _, _, err := tr.ReadRTP(); err != nil {
				if once.CompareAndSwap(false, true) {
					close(v.ended)
				}
				return
			}
			v.packets.Add(1)
			v.last.Store(time.Now().UnixNano())
		}
	})
	offer, _ := pc.CreateOffer(nil)
	g := webrtc.GatheringCompletePromise(pc)
	pc.SetLocalDescription(offer)
	<-g
	st, b := c.do("POST", fmt.Sprintf("/api/whep/%d", streamID), pc.LocalDescription().SDP,
		map[string]string{"Content-Type": "application/sdp", "Authorization": "Bearer " + ticket})
	if st != 201 {
		pc.Close()
		var e struct{ Code string }
		json.Unmarshal(b, &e)
		return nil, st, e.Code
	}
	if err := pc.SetRemoteDescription(webrtc.SessionDescription{Type: webrtc.SDPTypeAnswer, SDP: string(b)}); err != nil {
		c.t.Fatal(err)
	}
	return v, st, ""
}

func (c *client) watch(streamID int64, tab string) *viewer {
	c.t.Helper()
	tk, st, code := c.ticket(streamID, tab)
	// Like the real player: a source that is not on air yet (server just
	// started, demo still connecting) is retried instead of being an error.
	for deadline := time.Now().Add(20 * time.Second); st == 403 && code == "stream_offline" && time.Now().Before(deadline); {
		time.Sleep(500 * time.Millisecond)
		tk, st, code = c.ticket(streamID, tab)
	}
	if st != 200 {
		c.t.Fatalf("%s: ticket for stream %d => %d %s", c.name, streamID, st, code)
	}
	v, st, code := c.watchWithTicket(streamID, tk)
	if v == nil {
		c.t.Fatalf("%s: whep => %d %s", c.name, st, code)
	}
	if !v.waitPackets(100, 10*time.Second) {
		c.t.Fatalf("%s: no media received on stream %d", c.name, streamID)
	}
	return v
}

func (v *viewer) waitPackets(n int64, d time.Duration) bool {
	deadline := time.Now().Add(d)
	start := v.packets.Load()
	for time.Now().Before(deadline) {
		if v.packets.Load()-start >= n {
			return true
		}
		time.Sleep(50 * time.Millisecond)
	}
	return false
}

// stopLatency waits up to `wait` and reports how long after t0 the last
// packet arrived (negative/zero = stopped before the action returned).
// ok=false means packets were still flowing at the end of the wait.
func (v *viewer) stopLatency(t0 time.Time, wait time.Duration) (time.Duration, bool) {
	time.Sleep(wait)
	last := v.lastPacket()
	stillFlowing := time.Since(last) < 500*time.Millisecond
	return last.Sub(t0), !stillFlowing
}

func (v *viewer) stillFlowing(d time.Duration) bool { return v.waitPackets(50, d) }

// ---- RTMP publisher via ffmpeg (same protocol the DJI pult uses) ----

type pub struct {
	cmd  *exec.Cmd
	done chan struct{}
	out  *bytes.Buffer
}

func ffmpegPublish(t testing.TB, url, label string) *pub {
	cmd := exec.Command("ffmpeg", "-hide_banner", "-loglevel", "error", "-re", "-f", "lavfi", "-i", "testsrc2=size=640x360:rate=25",
		"-vf", `drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='`+label+"':fontsize=24:fontcolor=white:box=1:boxcolor=black:x=10:y=10",
		"-c:v", "libx264", "-profile:v", "baseline", "-preset", "veryfast", "-tune", "zerolatency", "-g", "25", "-bf", "0", "-b:v", "800k",
		"-f", "flv", url)
	p := &pub{cmd: cmd, done: make(chan struct{}), out: &bytes.Buffer{}}
	cmd.Stderr = p.out
	if err := cmd.Start(); err != nil {
		t.Fatalf("ffmpeg: %v", err)
	}
	go func() { cmd.Wait(); close(p.done) }()
	return p
}

// exited reports whether the publisher process ends within d (rejected/kicked).
func (p *pub) exited(d time.Duration) bool {
	select {
	case <-p.done:
		return true
	case <-time.After(d):
		return false
	}
}

func (p *pub) kill() {
	if p != nil && p.cmd.Process != nil {
		p.cmd.Process.Kill()
		<-p.done
	}
}

// embedFrontend copies web/dist (if built) into the embed directory so the
// test binary serves the real SPA (needed for /link).
func embedFrontend(t testing.TB) {
	src := filepath.Join(repoRoot(), "web", "dist")
	if _, err := os.Stat(filepath.Join(src, "index.html")); err != nil {
		t.Log("web/dist not built; SPA routes will 404")
		return
	}
	dst := filepath.Join(repoRoot(), "backend", "internal", "webui", "dist")
	filepath.Walk(src, func(p string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, p)
		if info.IsDir() {
			return os.MkdirAll(filepath.Join(dst, rel), 0o755)
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		return os.WriteFile(filepath.Join(dst, rel), b, 0o644)
	})
}
