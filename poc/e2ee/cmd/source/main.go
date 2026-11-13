// Command source is the publisher simulator (see internal/source).
//
//	source [-relay http://127.0.0.1:59320] [-stream demo] [-suite 5] [-fps 15]
//	       [-input sample.h264 | -ffmpeg path/to/ffmpeg | -synthetic]
//	       [-control-port 59322]
//
// Video: an H.264 Annex-B file, or a test pattern generated at start with
// ffmpeg, or (without ffmpeg) synthetic frames that are not decodable video
// but still exercise encryption and counters.
//
// Operator commands (list / approve / revoke / rotate / status) are read
// from standard input and from a loopback-only control endpoint
// (POST /cmd, used by cmd/operator).
package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"time"

	"dronstream-poc-e2ee/internal/h264"
	"dronstream-poc-e2ee/internal/local"
	"dronstream-poc-e2ee/internal/source"
	"dronstream-poc-e2ee/sframe"
)

func main() {
	relayURL := flag.String("relay", "http://127.0.0.1:59320", "relay base URL")
	stream := flag.String("stream", "demo", "stream id")
	suite := flag.Int("suite", 5, "SFrame cipher suite: 4 = AES_128_GCM_SHA256_128, 5 = AES_256_GCM_SHA512_128")
	fps := flag.Int("fps", 15, "frames per second")
	input := flag.String("input", "", "H.264 Annex-B file to loop")
	ffmpeg := flag.String("ffmpeg", "", "ffmpeg executable used to generate a test pattern (default: $FFMPEG, PATH, then the repository's .tools directory)")
	synthetic := flag.Bool("synthetic", false, "use synthetic (non-decodable) frames instead of video")
	controlPort := flag.Int("control-port", 59322, "loopback port of the operator control endpoint (-1 disables it, 0 picks a free port)")
	flag.Parse()

	units, err := loadVideo(*input, *ffmpeg, *synthetic, *fps)
	if err != nil {
		log.Fatalf("source: %v", err)
	}
	log.Printf("video: %s", h264.Describe(units))

	src, err := source.New(*relayURL, *stream, sframe.CipherSuite(*suite))
	if err != nil {
		log.Fatalf("source: %v", err)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	if *controlPort >= 0 {
		l, err := local.Listen(*controlPort)
		if err != nil {
			log.Fatalf("source: control endpoint: %v", err)
		}
		mux := http.NewServeMux()
		mux.Handle("POST /cmd", local.Guard(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			line, _ := io.ReadAll(io.LimitReader(r.Body, 1024))
			out := src.Command(r.Context(), string(line))
			log.Printf("operator (control endpoint): %s", strings.TrimSpace(string(line)))
			fmt.Fprintln(w, out)
		})))
		fmt.Printf("CONTROL %s\n", local.URL(l))
		go func() {
			srv := &http.Server{Handler: mux, ReadHeaderTimeout: 5 * time.Second}
			log.Fatal(srv.Serve(l))
		}()
	}

	go func() { // operator commands typed into this terminal
		in := bufio.NewScanner(os.Stdin)
		for in.Scan() {
			line := strings.TrimSpace(in.Text())
			if line == "quit" || line == "exit" {
				stop()
				return
			}
			if out := src.Command(ctx, line); out != "" {
				fmt.Println(out)
			}
		}
	}()

	fmt.Printf("READY stream=%s relay=%s\n", *stream, *relayURL)
	fmt.Println(source.Help)
	for ctx.Err() == nil {
		err := src.Run(ctx, units, *fps)
		if ctx.Err() != nil {
			break
		}
		log.Printf("upload to the relay ended (%v); retrying in 1s", err)
		select {
		case <-time.After(time.Second):
		case <-ctx.Done():
		}
	}
	log.Print("source stopped")
}

// loadVideo returns the access units to loop.
func loadVideo(input, ffmpeg string, synthetic bool, fps int) ([][]byte, error) {
	const gop, seconds = 15, 20
	if synthetic {
		log.Print("using synthetic frames: viewers will show counters but no picture")
		return h264.Synthetic(fps*seconds, gop), nil
	}
	var data []byte
	var err error
	if input != "" {
		if data, err = os.ReadFile(input); err != nil {
			return nil, err
		}
	} else {
		if ffmpeg == "" {
			if ffmpeg = h264.FindFFmpeg(); ffmpeg == "" {
				log.Print("ffmpeg not found (use -ffmpeg or -input); falling back to synthetic frames: counters but no picture")
				return h264.Synthetic(fps*seconds, gop), nil
			}
		}
		log.Printf("generating %d s test pattern with %s", seconds, ffmpeg)
		if data, err = h264.TestPattern(ffmpeg, fps, seconds, gop); err != nil {
			return nil, err
		}
	}
	units := h264.AccessUnits(data)
	if len(units) == 0 || !h264.IsKeyframe(units[0]) || !h264.HasParameterSets(units[0]) {
		return nil, fmt.Errorf("input is not an H.264 Annex-B stream starting with SPS, PPS and a key frame")
	}
	return units, nil
}
