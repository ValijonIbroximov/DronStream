package h264

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// TestPattern runs ffmpeg and returns a raw H.264 Annex-B test pattern:
// 640x360, baseline profile (no B-frames), a key frame carrying SPS/PPS
// every gop frames. Nothing is written to disk.
func TestPattern(ffmpeg string, fps, seconds, gop int) ([]byte, error) {
	cmd := exec.Command(ffmpeg, "-hide_banner", "-loglevel", "error",
		"-f", "lavfi", "-i", fmt.Sprintf("testsrc2=size=640x360:rate=%d", fps),
		"-t", fmt.Sprint(seconds),
		"-c:v", "libx264", "-profile:v", "baseline", "-pix_fmt", "yuv420p",
		"-g", fmt.Sprint(gop), "-keyint_min", fmt.Sprint(gop), "-sc_threshold", "0",
		"-bsf:v", "h264_mp4toannexb", "-f", "h264", "pipe:1")
	cmd.Stderr = os.Stderr
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("ffmpeg failed: %w", err)
	}
	return out, nil
}

// FindFFmpeg looks for ffmpeg: the FFMPEG environment variable, then PATH,
// then the repository's .tools directory (searched upwards from the current
// directory). It returns "" if none is found.
func FindFFmpeg() string {
	if p := os.Getenv("FFMPEG"); p != "" {
		return p
	}
	if p, err := exec.LookPath("ffmpeg"); err == nil {
		return p
	}
	dir, err := os.Getwd()
	for err == nil {
		if m, _ := filepath.Glob(filepath.Join(dir, ".tools", "ffmpeg*", "bin", "ffmpeg*")); len(m) > 0 {
			return m[0]
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return ""
}
