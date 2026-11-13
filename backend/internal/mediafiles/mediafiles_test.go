package mediafiles

import (
	"bytes"
	"image"
	"image/color"
	"image/gif"
	"image/jpeg"
	"image/png"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func img() image.Image {
	m := image.NewRGBA(image.Rect(0, 0, 800, 600))
	for x := 0; x < 800; x++ {
		m.Set(x, x%600, color.RGBA{255, 0, 0, 255})
	}
	return m
}

func TestImagesAccepted(t *testing.T) {
	st := &Store{Dir: t.TempDir(), MaxImageBytes: 10 << 20, MaxVideoBytes: 10 << 20}
	var p, j, g bytes.Buffer
	png.Encode(&p, img())
	jpeg.Encode(&j, img(), nil)
	gif.Encode(&g, img(), nil)
	for name, b := range map[string][]byte{"image/png": p.Bytes(), "image/jpeg": j.Bytes(), "image/gif": g.Bytes()} {
		m, err := st.Save(bytes.NewReader(b), "image")
		if err != nil || m.Mime != name || m.Width != 800 || !m.HasThumb {
			t.Fatalf("%s: %+v %v", name, m, err)
		}
		tp, _ := st.ThumbPath(m.FileID)
		if _, err := os.Stat(tp); err != nil {
			t.Fatal("thumb missing")
		}
	}
}

func TestDangerousRejected(t *testing.T) {
	st := &Store{Dir: t.TempDir(), MaxImageBytes: 1 << 20, MaxVideoBytes: 1 << 20}
	cases := map[string]string{
		"svg":          `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>`,
		"html-as-png":  "<html><script>alert(1)</script></html>",
		"script":       "<script>alert(1)</script>",
		"exe":          "MZ\x90\x00\x03\x00\x00\x00",
		"text":         "just text",
		"bom-svg":      "\xef\xbb\xbf<svg></svg>",
		"fake-png-hdr": "\x89PNG\r\n\x1a\nnot really",
	}
	for name, body := range cases {
		if _, err := st.Save(strings.NewReader(body), "image"); err == nil {
			t.Errorf("%s accepted", name)
		}
	}
	// size limit
	big := make([]byte, 2<<20)
	if _, err := st.Save(bytes.NewReader(big), "image"); err == nil {
		t.Error("oversize accepted")
	}
	// leftovers removed
	ents, _ := os.ReadDir(st.Dir)
	if len(ents) != 0 {
		t.Errorf("leftover files: %d", len(ents))
	}
	// type mismatch: real PNG uploaded as video
	var p bytes.Buffer
	png.Encode(&p, img())
	if _, err := st.Save(bytes.NewReader(p.Bytes()), "video"); err == nil {
		t.Error("png accepted as video")
	}
	if _, err := st.Path("../../etc/passwd"); err == nil {
		t.Error("path traversal id accepted")
	}
}

// TestVideoCodecs needs ffmpeg (dev tool) to produce real files.
func TestVideoCodecs(t *testing.T) {
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		t.Skip("ffmpeg not on PATH")
	}
	dir := t.TempDir()
	mk := func(name string, args ...string) string {
		out := filepath.Join(dir, name)
		a := append([]string{"-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=320x240:rate=25:duration=1"}, args...)
		if b, err := exec.Command("ffmpeg", append(a, out)...).CombinedOutput(); err != nil {
			t.Fatalf("ffmpeg %s: %v %s", name, err, b)
		}
		return out
	}
	st := &Store{Dir: filepath.Join(dir, "store"), MaxImageBytes: 1 << 20, MaxVideoBytes: 50 << 20}
	ok := map[string]string{
		"h264.mp4":  mk("h264.mp4", "-c:v", "libx264", "-pix_fmt", "yuv420p"),
		"h264f.mp4": mk("h264f.mp4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart"),
		"vp9.webm":  mk("vp9.webm", "-c:v", "libvpx-vp9", "-b:v", "200k"),
	}
	for n, p := range ok {
		f, _ := os.Open(p)
		m, err := st.Save(f, "video")
		f.Close()
		if err != nil {
			t.Errorf("%s rejected: %v", n, err)
			continue
		}
		t.Logf("%s -> %s %s", n, m.Mime, m.Codec)
	}
	hevc := mk("hevc.mp4", "-c:v", "libx265", "-pix_fmt", "yuv420p", "-x265-params", "log-level=error")
	f, _ := os.Open(hevc)
	_, err := st.Save(f, "video")
	f.Close()
	if err == nil || !strings.Contains(err.Error(), "H.265") {
		t.Errorf("HEVC must be rejected with a clear message, got %v", err)
	}
}
