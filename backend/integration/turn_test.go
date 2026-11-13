//go:build integration

package integration

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/pion/webrtc/v4"
)

// TestTURNRelay: built-in TURN with short-lived credentials; the viewer is
// forced to relay-only ICE, so media can only flow through our own TURN.
func TestTURNRelay(t *testing.T) {
	bin := buildServer(t)
	root := t.TempDir()
	os.MkdirAll(filepath.Join(root, "config"), 0o700)
	cfg := testConfig(120) + `turn:
  mode: builtin
  listen: "127.0.0.1:13478"
  public_ip: "127.0.0.1"
  urls: ["turn:127.0.0.1:13478?transport=udp"]
  relay_port_min: 51000
  relay_port_max: 51050
  credential_minutes: 10
`
	os.WriteFile(filepath.Join(root, "config", "dronstream.yaml"), []byte(cfg), 0o600)
	srv := startServer(t, bin, root)
	defer srv.stop()
	admin := newClient(t, "admin")
	tok, _ := os.ReadFile(filepath.Join(root, "data", "runtime", "setup-token.txt"))
	_, b := admin.do("POST", "/api/setup", map[string]string{"setupToken": strings.TrimSpace(string(tok)), "username": "boss", "password": "Correct-Horse-1"}, nil)
	admin.absorbSession(b)
	if !admin.waitOnline("demo-a", true, 20*time.Second) {
		t.Fatal("demo offline")
	}
	id := admin.streams()["demo-a"].ID
	st, body := admin.do("POST", fmt.Sprintf("/api/watch/%d/ticket", id), map[string]string{"tab": "turn"}, nil)
	if st != 200 {
		t.Fatalf("ticket %d %s", st, body)
	}
	var tr struct {
		Ticket     string
		IceServers []struct {
			URLs       []string
			Username   string
			Credential string
		}
	}
	json.Unmarshal(body, &tr)
	if len(tr.IceServers) != 1 || tr.IceServers[0].Username == "" || !strings.Contains(tr.IceServers[0].Username, ":") {
		t.Fatalf("ice servers: %s", body)
	}
	se := webrtc.SettingEngine{}
	se.SetIncludeLoopbackCandidate(true)
	se.SetNetworkTypes([]webrtc.NetworkType{webrtc.NetworkTypeUDP4})
	pc, err := webrtc.NewAPI(webrtc.WithSettingEngine(se)).NewPeerConnection(webrtc.Configuration{
		ICETransportPolicy: webrtc.ICETransportPolicyRelay,
		ICEServers:         []webrtc.ICEServer{{URLs: tr.IceServers[0].URLs, Username: tr.IceServers[0].Username, Credential: tr.IceServers[0].Credential}},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer pc.Close()
	pc.AddTransceiverFromKind(webrtc.RTPCodecTypeVideo, webrtc.RTPTransceiverInit{Direction: webrtc.RTPTransceiverDirectionRecvonly})
	got := make(chan struct{}, 1)
	pc.OnTrack(func(tr *webrtc.TrackRemote, _ *webrtc.RTPReceiver) {
		for i := 0; ; i++ {
			if _, _, err := tr.ReadRTP(); err != nil {
				return
			}
			if i == 100 {
				got <- struct{}{}
			}
		}
	})
	offer, _ := pc.CreateOffer(nil)
	g := webrtc.GatheringCompletePromise(pc)
	pc.SetLocalDescription(offer)
	<-g
	if !strings.Contains(pc.LocalDescription().SDP, "typ relay") {
		t.Fatal("no relay candidate gathered from built-in TURN")
	}
	st, ans := admin.do("POST", fmt.Sprintf("/api/whep/%d", id), pc.LocalDescription().SDP, map[string]string{"Content-Type": "application/sdp", "Authorization": "Bearer " + tr.Ticket})
	if st != 201 {
		t.Fatalf("whep %d %s", st, ans)
	}
	pc.SetRemoteDescription(webrtc.SessionDescription{Type: webrtc.SDPTypeAnswer, SDP: string(ans)})
	select {
	case <-got:
	case <-time.After(15 * time.Second):
		t.Fatal("no media through TURN relay")
	}
	// bad credentials are rejected by the TURN server
	pc2, _ := webrtc.NewAPI(webrtc.WithSettingEngine(se)).NewPeerConnection(webrtc.Configuration{
		ICETransportPolicy: webrtc.ICETransportPolicyRelay,
		ICEServers:         []webrtc.ICEServer{{URLs: tr.IceServers[0].URLs, Username: "9999999999:x", Credential: "wrong"}},
	})
	defer pc2.Close()
	pc2.AddTransceiverFromKind(webrtc.RTPCodecTypeVideo, webrtc.RTPTransceiverInit{Direction: webrtc.RTPTransceiverDirectionRecvonly})
	o2, _ := pc2.CreateOffer(nil)
	g2 := webrtc.GatheringCompletePromise(pc2)
	pc2.SetLocalDescription(o2)
	<-g2
	if strings.Contains(pc2.LocalDescription().SDP, "typ relay") {
		t.Fatal("TURN accepted wrong credentials")
	}
	os.WriteFile(filepath.Join(repoRoot(), "build", "test-results", "turn.json"), []byte(`{"turn_builtin_relay_media":"PASS","turn_bad_credentials_rejected":"PASS"}`), 0o644)
}
