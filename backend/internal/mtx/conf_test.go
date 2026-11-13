package mtx

import (
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

func TestRenderLockedDown(t *testing.T) {
	b, err := Render(ConfInput{HookURL: "http://127.0.0.1:9180/internal/mtx-auth/x", APIAddr: "127.0.0.1:9997", WebRTCHTTPAddr: "127.0.0.1:8889", WebRTCUDPAddr: ":8189", RTMPAddr: "10.8.0.1:1935"})
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	if err := yaml.Unmarshal(b, &m); err != nil {
		t.Fatal(err)
	}
	want := map[string]any{"authMethod": "http", "hls": false, "rtsp": false, "srt": false, "moq": false, "playback": false, "metrics": false, "pprof": false,
		"apiAddress": "127.0.0.1:9997", "webrtcAddress": "127.0.0.1:8889", "rtmpAddress": "10.8.0.1:1935", "rtmpEncryption": "no"}
	for k, v := range want {
		if m[k] != v {
			t.Errorf("%s = %v, want %v", k, m[k], v)
		}
	}
	pd := m["pathDefaults"].(map[string]any)
	if pd["overridePublisher"] != false || pd["record"] != false {
		t.Error("pathDefaults")
	}
	if strings.Contains(string(b), "all_others") {
		t.Error("catch-all path present")
	}
	ex := m["authHTTPExclude"].([]any)
	if len(ex) != 1 || ex[0].(map[string]any)["action"] != "api" {
		t.Errorf("only api may be excluded: %v", ex)
	}
}

func TestRenderRTMPS(t *testing.T) {
	b, _ := Render(ConfInput{HookURL: "x", APIAddr: "127.0.0.1:1", WebRTCHTTPAddr: "127.0.0.1:2", RTMPAddr: "10.8.0.1:1935", RTMPSAddr: ":1936", TLSCert: "c", TLSKey: "k"})
	s := string(b)
	if !strings.Contains(s, "rtmpEncryption: optional") || !strings.Contains(s, "rtmpsAddress: :1936") {
		t.Fatal(s)
	}
}
