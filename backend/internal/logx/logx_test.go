package logx

import (
	"bytes"
	"log/slog"
	"strings"
	"testing"
)

func TestMask(t *testing.T) {
	m := &Masker{}
	m.Add("LITERALSECRET123")
	in := `rtmp://h/live/cam?key=ABCDEF123 Authorization: Bearer tok.en-1 POST /internal/mtx-auth/hooksecret path live/cam1/Zx9Kq2Lm8Pq LITERALSECRET123 pass=hunter2&x=1`
	out := m.Mask(in)
	for _, s := range []string{"ABCDEF123", "tok.en-1", "hooksecret", "Zx9Kq2Lm8Pq", "LITERALSECRET123", "hunter2"} {
		if strings.Contains(out, s) {
			t.Errorf("not masked: %s in %s", s, out)
		}
	}
	if !strings.Contains(out, "x=1") || !strings.Contains(out, "live/cam1/***") {
		t.Errorf("over-masked: %s", out)
	}
}

func TestHandlerMasksAttrs(t *testing.T) {
	var b bytes.Buffer
	l := slog.New(NewHandler(&b, slog.LevelInfo, &Masker{}))
	l.Info("x", "publishKey", "SECRETVALUE", "ticket", "TICKETVAL77", "path", "live/a?key=K2")
	if strings.Contains(b.String(), "SECRETVALUE") || strings.Contains(b.String(), "TICKETVAL77") || strings.Contains(b.String(), "K2") {
		t.Fatal(b.String())
	}
}
