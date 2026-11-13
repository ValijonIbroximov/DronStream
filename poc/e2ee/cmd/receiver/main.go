// Command receiver is a headless viewer written in Go. It does what the
// browser page does (key pair, fingerprint, join request, HPKE open, SFrame
// decrypt, replay rejection) except decoding the picture, and is used to
// check the running demo without a browser.
//
//	receiver [-relay http://127.0.0.1:59320] [-stream demo] [-label go-receiver]
//	         [-frames 45] [-timeout 60s]
//
// It prints its fingerprint, waits to be approved by the operator, and exits
// with status 0 after -frames frames were decrypted (0 = run until stopped).
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"time"

	"dronstream-poc-e2ee/internal/h264"
	"dronstream-poc-e2ee/internal/viewer"
)

func main() {
	relayURL := flag.String("relay", "http://127.0.0.1:59320", "relay base URL")
	stream := flag.String("stream", "demo", "stream id")
	label := flag.String("label", "go-receiver", "label shown to the operator")
	frames := flag.Uint64("frames", 45, "exit successfully after this many decrypted frames (0 = never)")
	timeout := flag.Duration("timeout", 60*time.Second, "give up after this long (0 = never)")
	flag.Parse()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	if *timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, *timeout)
		defer cancel()
	}

	c, err := viewer.NewClient(*relayURL, *stream)
	if err != nil {
		log.Fatalf("receiver: %v", err)
	}
	c.MinFetchInterval = 300 * time.Millisecond
	fmt.Printf("FINGERPRINT %s\n", c.Fingerprint)
	if err := c.Join(ctx, *label); err != nil {
		log.Fatalf("receiver: %v", err)
	}
	if err := c.Subscribe(ctx); err != nil {
		log.Fatalf("receiver: %v", err)
	}
	defer c.Close()
	fmt.Println("STATE waiting for approval")

	// lostAfterStart counts frames that could not be decrypted after the
	// first successful one (0 means: no gap, also not at an epoch change).
	keyframes, lostAfterStart, lastReport, state := 0, 0, time.Now(), "waiting for approval"
	report := func(prefix string) {
		s := c.Receiver.Stats
		fmt.Printf("%s received=%d decrypted=%d auth_failures=%d replays_rejected=%d no_key=%d lost_after_start=%d epoch=%d keyframes=%d\n",
			prefix, s.Received, s.Decrypted, s.AuthFailures, s.ReplaysRejected, s.NoKey, lostAfterStart, s.Epoch, keyframes)
	}
	for {
		plaintext, res, err := c.Next(ctx)
		if err != nil {
			report("RESULT failed")
			log.Fatalf("receiver: stream ended: %v", err)
		}
		newState := state
		switch res {
		case viewer.Decrypted:
			newState = "decrypting"
			if h264.IsKeyframe(plaintext) {
				keyframes++
			}
		case viewer.NoKey:
			if c.Receiver.Stats.Epoch > 0 {
				newState = "revoked: no key for the current epoch"
				lostAfterStart++
			}
		case viewer.AuthFailure:
			if c.Receiver.Stats.Epoch > 0 {
				lostAfterStart++
			}
		}
		if newState != state {
			state = newState
			fmt.Println("STATE " + state)
		}
		if time.Since(lastReport) >= time.Second {
			lastReport = time.Now()
			report("STATS")
		}
		if *frames > 0 && c.Receiver.Stats.Decrypted >= *frames {
			report("RESULT ok")
			return
		}
	}
}
