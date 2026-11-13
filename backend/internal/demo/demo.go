// Package demo publishes built-in test-pattern sources until a real pult is
// connected. The clips are pre-encoded H.264 baseline (no B-frames), each
// frame carries the text "DEMO - TEST MANBA (haqiqiy pult emas)". Publishing
// uses WebRTC/WHIP to MediaMTX over loopback with the stream's normal publish
// key, so it goes through exactly the same authorisation hook.
package demo

import (
	"bytes"
	"context"
	_ "embed"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/pion/webrtc/v4"
	"github.com/pion/webrtc/v4/pkg/media"
	"github.com/pion/webrtc/v4/pkg/media/h264reader"
)

//go:embed assets/demo_a.h264
var clipA []byte

//go:embed assets/demo_b.h264
var clipB []byte

// Clip returns the embedded clip by index (0 = A, 1 = B).
func Clip(i int) []byte {
	if i%2 == 0 {
		return clipA
	}
	return clipB
}

const frameDur = 40 * time.Millisecond // 25 fps

// Source describes what the publisher needs; Key/Path are fetched on every
// (re)connect so key rotation and path-mode changes are honoured.
type Source struct {
	Name   string
	Clip   []byte
	Target func(ctx context.Context) (whipURL, key string, err error)
}

// Run keeps publishing until ctx is cancelled, reconnecting with backoff.
func Run(ctx context.Context, src Source, log *slog.Logger) {
	backoff := 2 * time.Second
	for ctx.Err() == nil {
		start := time.Now()
		err := publishOnce(ctx, src)
		if ctx.Err() != nil {
			return
		}
		if time.Since(start) > 30*time.Second {
			backoff = 2 * time.Second
		}
		log.Info("demo source disconnected; retrying", "source", src.Name, "err", err, "in", backoff)
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}
		if backoff < 30*time.Second {
			backoff *= 2
		}
	}
}

func publishOnce(ctx context.Context, src Source) error {
	url, key, err := src.Target(ctx)
	if err != nil {
		return err
	}
	se := webrtc.SettingEngine{}
	se.SetIncludeLoopbackCandidate(true)
	se.SetNetworkTypes([]webrtc.NetworkType{webrtc.NetworkTypeUDP4})
	m := &webrtc.MediaEngine{}
	if err := m.RegisterDefaultCodecs(); err != nil {
		return err
	}
	api := webrtc.NewAPI(webrtc.WithSettingEngine(se), webrtc.WithMediaEngine(m))
	pc, err := api.NewPeerConnection(webrtc.Configuration{})
	if err != nil {
		return err
	}
	defer pc.Close()
	track, err := webrtc.NewTrackLocalStaticSample(webrtc.RTPCodecCapability{
		MimeType: webrtc.MimeTypeH264, ClockRate: 90000,
		SDPFmtpLine: "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f",
	}, "video", "dronstream-demo")
	if err != nil {
		return err
	}
	sender, err := pc.AddTrack(track)
	if err != nil {
		return err
	}
	go func() { // drain RTCP
		buf := make([]byte, 1500)
		for {
			if _, _, err := sender.Read(buf); err != nil {
				return
			}
		}
	}()
	failed := make(chan struct{})
	var once bool
	pc.OnConnectionStateChange(func(s webrtc.PeerConnectionState) {
		if (s == webrtc.PeerConnectionStateFailed || s == webrtc.PeerConnectionStateClosed || s == webrtc.PeerConnectionStateDisconnected) && !once {
			once = true
			close(failed)
		}
	})
	offer, err := pc.CreateOffer(nil)
	if err != nil {
		return err
	}
	gather := webrtc.GatheringCompletePromise(pc)
	if err := pc.SetLocalDescription(offer); err != nil {
		return err
	}
	select {
	case <-gather:
	case <-time.After(5 * time.Second):
	}
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBufferString(pc.LocalDescription().SDP))
	req.Header.Set("Content-Type", "application/sdp")
	req.Header.Set("Authorization", "Bearer "+key)
	resp, err := (&http.Client{Timeout: 15 * time.Second}).Do(req)
	if err != nil {
		return err
	}
	ans, _ := io.ReadAll(io.LimitReader(resp.Body, 256<<10))
	resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("WHIP rejected: %d", resp.StatusCode)
	}
	if err := pc.SetRemoteDescription(webrtc.SessionDescription{Type: webrtc.SDPTypeAnswer, SDP: string(ans)}); err != nil {
		return err
	}
	return pump(ctx, track, src.Clip, failed)
}

func pump(ctx context.Context, track *webrtc.TrackLocalStaticSample, clip []byte, failed <-chan struct{}) error {
	tick := time.NewTicker(frameDur)
	defer tick.Stop()
	for {
		r, err := h264reader.NewReader(bytes.NewReader(clip))
		if err != nil {
			return err
		}
		for {
			nal, err := r.NextNAL()
			if errors.Is(err, io.EOF) {
				break
			}
			if err != nil {
				return err
			}
			vcl := nal.UnitType == h264reader.NalUnitTypeCodedSliceIdr || nal.UnitType == h264reader.NalUnitTypeCodedSliceNonIdr
			dur := time.Duration(0)
			if vcl {
				select {
				case <-ctx.Done():
					return nil
				case <-failed:
					return errors.New("peer connection closed")
				case <-tick.C:
				}
				dur = frameDur
			}
			if err := track.WriteSample(media.Sample{Data: nal.Data, Duration: dur}); err != nil {
				return err
			}
		}
	}
}
