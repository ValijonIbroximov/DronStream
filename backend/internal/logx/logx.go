// Package logx provides a size-rotated log file and secret masking for both
// DronStream's own logs and the captured MediaMTX output.
package logx

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
)

// Rotating is an io.Writer that rotates at MaxBytes keeping Keep old files.
type Rotating struct {
	mu       sync.Mutex
	path     string
	maxBytes int64
	keep     int
	f        *os.File
	size     int64
}

func NewRotating(path string, maxMB, keep int) (*Rotating, error) {
	if maxMB <= 0 {
		maxMB = 20
	}
	if keep <= 0 {
		keep = 5
	}
	r := &Rotating{path: path, maxBytes: int64(maxMB) << 20, keep: keep}
	return r, r.open()
}

func (r *Rotating) open() error {
	if err := os.MkdirAll(filepath.Dir(r.path), 0o700); err != nil {
		return err
	}
	f, err := os.OpenFile(r.path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	st, _ := f.Stat()
	r.f, r.size = f, st.Size()
	return nil
}

func (r *Rotating) Write(p []byte) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.size+int64(len(p)) > r.maxBytes {
		r.f.Close()
		for i := r.keep - 1; i >= 1; i-- {
			os.Rename(fmt.Sprintf("%s.%d", r.path, i), fmt.Sprintf("%s.%d", r.path, i+1))
		}
		os.Rename(r.path, r.path+".1")
		if err := r.open(); err != nil {
			return 0, err
		}
	}
	n, err := r.f.Write(p)
	r.size += int64(n)
	return n, err
}

func (r *Rotating) Close() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.f.Close()
}

// Masker replaces secrets in free text.
type Masker struct {
	mu      sync.RWMutex
	secrets []string
}

var genericRe = regexp.MustCompile(`(?i)((?:key|token|pass|password|secret|ticket)=)[^&\s"']+`)
var bearerRe = regexp.MustCompile(`(?i)(bearer\s+)[A-Za-z0-9._~+/=-]+`)
var hookRe = regexp.MustCompile(`(/internal/mtx-auth/)[A-Za-z0-9_-]+`)
var pathKeyRe = regexp.MustCompile(`(live/[a-z0-9][a-z0-9_-]{1,39}/)[A-Za-z0-9]{8,128}`)

// Add registers a literal secret to mask (e.g. a publish key in path mode).
func (m *Masker) Add(s string) {
	if len(s) < 6 {
		return
	}
	m.mu.Lock()
	m.secrets = append(m.secrets, s)
	if len(m.secrets) > 2000 {
		m.secrets = m.secrets[len(m.secrets)-1000:]
	}
	m.mu.Unlock()
}

func (m *Masker) Mask(s string) string {
	s = genericRe.ReplaceAllString(s, "${1}***")
	s = bearerRe.ReplaceAllString(s, "${1}***")
	s = hookRe.ReplaceAllString(s, "${1}***")
	s = pathKeyRe.ReplaceAllString(s, "${1}***")
	m.mu.RLock()
	for _, sec := range m.secrets {
		if strings.Contains(s, sec) {
			s = strings.ReplaceAll(s, sec, "***")
		}
	}
	m.mu.RUnlock()
	return s
}

// MaskWriter masks each line before writing it to W.
type MaskWriter struct {
	W   io.Writer
	M   *Masker
	mu  sync.Mutex
	buf []byte
}

func (w *MaskWriter) Write(p []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.buf = append(w.buf, p...)
	for {
		i := strings.IndexByte(string(w.buf), '\n')
		if i < 0 {
			if len(w.buf) > 64<<10 {
				w.W.Write([]byte(w.M.Mask(string(w.buf)) + "\n"))
				w.buf = w.buf[:0]
			}
			break
		}
		line := string(w.buf[:i+1])
		w.buf = w.buf[i+1:]
		if _, err := w.W.Write([]byte(w.M.Mask(line))); err != nil {
			return len(p), err
		}
	}
	return len(p), nil
}

// maskHandler masks attribute values whose key looks secret and the message.
type maskHandler struct {
	h slog.Handler
	m *Masker
}

func NewHandler(w io.Writer, level slog.Level, m *Masker) slog.Handler {
	return &maskHandler{h: slog.NewTextHandler(w, &slog.HandlerOptions{Level: level}), m: m}
}

func (h *maskHandler) Enabled(ctx context.Context, l slog.Level) bool { return h.h.Enabled(ctx, l) }
func (h *maskHandler) WithAttrs(a []slog.Attr) slog.Handler {
	return &maskHandler{h: h.h.WithAttrs(h.maskAttrs(a)), m: h.m}
}
func (h *maskHandler) WithGroup(n string) slog.Handler { return &maskHandler{h: h.h.WithGroup(n), m: h.m} }

func (h *maskHandler) Handle(ctx context.Context, r slog.Record) error {
	nr := slog.NewRecord(r.Time, r.Level, h.m.Mask(r.Message), r.PC)
	var attrs []slog.Attr
	r.Attrs(func(a slog.Attr) bool { attrs = append(attrs, a); return true })
	nr.AddAttrs(h.maskAttrs(attrs)...)
	return h.h.Handle(ctx, nr)
}

func (h *maskHandler) maskAttrs(in []slog.Attr) []slog.Attr {
	out := make([]slog.Attr, len(in))
	for i, a := range in {
		k := strings.ToLower(a.Key)
		if strings.Contains(k, "key") || strings.Contains(k, "token") || strings.Contains(k, "pass") || strings.Contains(k, "secret") || strings.Contains(k, "ticket") || strings.Contains(k, "cookie") {
			out[i] = slog.String(a.Key, "***")
			continue
		}
		if a.Value.Kind() == slog.KindString {
			out[i] = slog.String(a.Key, h.m.Mask(a.Value.String()))
			continue
		}
		out[i] = a
	}
	return out
}

func ParseLevel(s string) slog.Level {
	switch strings.ToLower(s) {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	}
	return slog.LevelInfo
}
