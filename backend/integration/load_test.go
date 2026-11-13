//go:build integration

package integration

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

type procSample struct {
	CPUSec float64
	WSMB   float64
}

func procStats(pid int) procSample {
	out, err := exec.Command("powershell", "-NoProfile", "-Command",
		fmt.Sprintf("$p=Get-Process -Id %d; '{0} {1}' -f $p.CPU, $p.WorkingSet64", pid)).Output()
	if err != nil {
		return procSample{}
	}
	f := strings.Fields(strings.ReplaceAll(strings.TrimSpace(string(out)), ",", "."))
	if len(f) != 2 {
		return procSample{}
	}
	c, _ := strconv.ParseFloat(f[0], 64)
	w, _ := strconv.ParseFloat(f[1], 64)
	return procSample{CPUSec: c, WSMB: w / (1 << 20)}
}

// TestLoad: 4 streams x 5 viewers (20 real WebRTC sessions) for DS_LOAD_SECONDS (default 60).
func TestLoad(t *testing.T) {
	dur := 60 * time.Second
	if s := os.Getenv("DS_LOAD_SECONDS"); s != "" {
		n, _ := strconv.Atoi(s)
		dur = time.Duration(n) * time.Second
	}
	bin := buildServer(t)
	root := t.TempDir()
	os.MkdirAll(filepath.Join(root, "config"), 0o700)
	os.WriteFile(filepath.Join(root, "config", "dronstream.yaml"), []byte(testConfig(120)), 0o600)
	srv := startServer(t, bin, root)
	defer srv.stop()
	admin := newClient(t, "admin")
	tok, _ := os.ReadFile(filepath.Join(root, "data", "runtime", "setup-token.txt"))
	_, b := admin.do("POST", "/api/setup", map[string]string{"setupToken": strings.TrimSpace(string(tok)), "username": "boss", "password": "Correct-Horse-1"}, nil)
	admin.absorbSession(b)
	if !admin.waitOnline("demo-a", true, 20*time.Second) || !admin.waitOnline("demo-b", true, 20*time.Second) {
		t.Fatal("demo offline")
	}
	var ids []int64
	ids = append(ids, admin.streams()["demo-a"].ID, admin.streams()["demo-b"].ID)
	for i := 1; i <= 2; i++ {
		var cr struct {
			Stream stream
			URLs   map[string]string
		}
		admin.mustJSON("POST", "/api/admin/streams", map[string]string{"name": fmt.Sprintf("Load %d", i), "slug": fmt.Sprintf("load%d", i)}, &cr)
		cmd := exec.Command("ffmpeg", "-hide_banner", "-loglevel", "error", "-re", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30",
			"-c:v", "libx264", "-profile:v", "baseline", "-preset", "veryfast", "-tune", "zerolatency", "-g", "30", "-bf", "0",
			"-b:v", "2500k", "-maxrate", "2500k", "-bufsize", "2500k", "-f", "flv", cr.URLs["rtmp"])
		if err := cmd.Start(); err != nil {
			t.Fatal(err)
		}
		defer cmd.Process.Kill()
		if !admin.waitOnline(fmt.Sprintf("load%d", i), true, 20*time.Second) {
			t.Fatal("rtmp source offline")
		}
		ids = append(ids, cr.Stream.ID)
	}
	var viewers []*viewer
	for u := 1; u <= 5; u++ {
		name := fmt.Sprintf("viewer%d", u)
		admin.mustJSON("POST", "/api/admin/users", map[string]string{"username": name, "password": "Password-" + name, "role": "user"}, nil)
		admin.grant("user", admin.userID(name), ids, nil)
		c := newClient(t, name)
		if c.login(name, "Password-"+name) != 200 {
			t.Fatal("login")
		}
		for _, id := range ids {
			viewers = append(viewers, c.watch(id, fmt.Sprintf("s%d", id)))
		}
	}
	defer func() {
		for _, v := range viewers {
			v.close()
		}
	}()
	_, sb := statusJSON(root)
	var st struct{ MediamtxPid, Pid int }
	json.Unmarshal(sb, &st)
	time.Sleep(5 * time.Second) // warm-up
	p0d, p0m := procStats(st.Pid), procStats(st.MediamtxPid)
	pk0 := make([]int64, len(viewers))
	for i, v := range viewers {
		pk0[i] = v.packets.Load()
	}
	t0 := time.Now()
	var maxWSd, maxWSm float64
	type pathRate struct{ In, Out float64 }
	var rates []map[string]pathRate
	for time.Since(t0) < dur {
		time.Sleep(5 * time.Second)
		d, m := procStats(st.Pid), procStats(st.MediamtxPid)
		if d.WSMB > maxWSd {
			maxWSd = d.WSMB
		}
		if m.WSMB > maxWSm {
			maxWSm = m.WSMB
		}
		r := map[string]pathRate{}
		for slug, s := range admin.streams() {
			_ = s
			var full []struct {
				Slug  string
				Stats struct{ InboundKbps, OutboundKbps float64 }
			}
			_, raw := admin.do("GET", "/api/admin/streams", nil, nil)
			json.Unmarshal(raw, &full)
			for _, f := range full {
				r[f.Slug] = pathRate{f.Stats.InboundKbps, f.Stats.OutboundKbps}
			}
			_ = slug
			break
		}
		rates = append(rates, r)
	}
	el := time.Since(t0).Seconds()
	p1d, p1m := procStats(st.Pid), procStats(st.MediamtxPid)
	stalled := 0
	var minPPS, maxPPS float64 = 1e9, 0
	for i, v := range viewers {
		pps := float64(v.packets.Load()-pk0[i]) / el
		if pps < minPPS {
			minPPS = pps
		}
		if pps > maxPPS {
			maxPPS = pps
		}
		if time.Since(v.lastPacket()) > 2*time.Second {
			stalled++
		}
	}
	avg := map[string]pathRate{}
	for _, r := range rates {
		for k, v := range r {
			a := avg[k]
			a.In += v.In / float64(len(rates))
			a.Out += v.Out / float64(len(rates))
			avg[k] = a
		}
	}
	var totIn, totOut float64
	for _, v := range avg {
		totIn += v.In
		totOut += v.Out
	}
	cores := float64(func() int { n, _ := strconv.Atoi(os.Getenv("NUMBER_OF_PROCESSORS")); return n }())
	res := map[string]any{
		"streams": len(ids), "viewers": len(viewers), "duration_s": el,
		"dronstream_cpu_pct_of_one_core": (p1d.CPUSec - p0d.CPUSec) / el * 100,
		"mediamtx_cpu_pct_of_one_core":   (p1m.CPUSec - p0m.CPUSec) / el * 100,
		"logical_cores":                  cores,
		"dronstream_max_ram_mb":          maxWSd, "mediamtx_max_ram_mb": maxWSm,
		"per_stream_avg_kbps": avg, "total_ingest_mbps": totIn / 1000, "total_egress_mbps": totOut / 1000,
		"viewer_rtp_pps_min": minPPS, "viewer_rtp_pps_max": maxPPS, "stalled_viewers": stalled,
		"note": "sources, server and all viewers on the same machine (loopback); ffmpeg encoders also consume CPU (not included)",
	}
	b2, _ := json.MarshalIndent(res, "", "  ")
	t.Logf("LOAD RESULT:\n%s", b2)
	os.MkdirAll(filepath.Join(repoRoot(), "build", "test-results"), 0o755)
	os.WriteFile(filepath.Join(repoRoot(), "build", "test-results", "load.json"), b2, 0o644)
	if stalled > 0 {
		t.Fatalf("%d viewers stalled", stalled)
	}
}
