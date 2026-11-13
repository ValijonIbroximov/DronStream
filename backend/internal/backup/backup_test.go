package backup

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestRoundTripAndWrongPass(t *testing.T) {
	dir := t.TempDir()
	out := filepath.Join(dir, "b.dsbak")
	m := Manifest{Format: 1, SchemaVersion: 1, CreatedAt: time.Now()}
	files := []File{{Name: "dronstream.db", Data: []byte("SQLite format 3\x00...")}, {Name: "master.key", Data: make([]byte, 32)}}
	if err := Create(out, "short", m, files); err == nil {
		t.Fatal("short passphrase accepted")
	}
	if err := Create(out, "a-long-passphrase", m, files); err != nil {
		t.Fatal(err)
	}
	raw, _ := os.ReadFile(out)
	if len(raw) < 100 || string(raw[:7]) != magic {
		t.Fatal("format")
	}
	if _, _, err := Open(out, "wrong-passphrase!"); err == nil {
		t.Fatal("wrong passphrase opened backup")
	}
	got, fs, err := Open(out, "a-long-passphrase")
	if err != nil || got.SchemaVersion != 1 || len(fs["master.key"]) != 32 {
		t.Fatalf("open: %v %+v", err, got)
	}
	// tamper
	raw[len(raw)-5] ^= 1
	os.WriteFile(out, raw, 0o600)
	if _, _, err := Open(out, "a-long-passphrase"); err == nil {
		t.Fatal("tampered backup accepted")
	}
}
