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
	if err := CreateV1(out, "short", m, files); err == nil {
		t.Fatal("short passphrase accepted")
	}
	if err := CreateV1(out, "a-long-passphrase", m, files); err != nil {
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

func TestV2StreamingWithMedia(t *testing.T) {
	dir := t.TempDir()
	media := filepath.Join(dir, "media")
	os.MkdirAll(media, 0o700)
	big := make([]byte, 3*chunkSize+123) // spans several chunks
	for i := range big {
		big[i] = byte(i * 7)
	}
	os.WriteFile(filepath.Join(media, "0123456789abcdef0123456789abcdef"), big, 0o600)
	os.WriteFile(filepath.Join(dir, "db"), []byte("SQLite format 3\x00 db"), 0o600)
	out := filepath.Join(dir, "b2.dsbak")
	if err := Create(out, "a-long-passphrase", Manifest{SchemaVersion: 2}, []File{{Name: "dronstream.db", Path: filepath.Join(dir, "db")}, {Name: "master.key", Data: make([]byte, 32)}}, Dir{Prefix: "media/", Path: media}); err != nil {
		t.Fatal(err)
	}
	if _, err := OpenArchive(out, "wrong-passphrase-x", dir); err == nil {
		t.Fatal("wrong passphrase accepted")
	}
	a, err := OpenArchive(out, "a-long-passphrase", dir)
	if err != nil {
		t.Fatal(err)
	}
	if a.Manifest.Format != 2 || a.Manifest.MediaFiles != 1 || len(a.Small["master.key"]) != 32 {
		t.Fatalf("manifest %+v", a.Manifest)
	}
	dst := filepath.Join(dir, "restored")
	if n, err := a.ExtractMedia(dst); err != nil || n != 1 {
		t.Fatalf("media %d %v", n, err)
	}
	got, _ := os.ReadFile(filepath.Join(dst, "0123456789abcdef0123456789abcdef"))
	if len(got) != len(big) || got[len(got)-1] != big[len(big)-1] {
		t.Fatal("media mismatch")
	}
	a.WriteDB(filepath.Join(dir, "db2"))
	a.Close()
	// truncation: drop the final chunk
	raw, _ := os.ReadFile(out)
	os.WriteFile(out, raw[:len(raw)-200], 0o600)
	if _, err := OpenArchive(out, "a-long-passphrase", dir); err == nil {
		t.Fatal("truncated backup accepted")
	}
	// v1 archives still open
	v1 := filepath.Join(dir, "v1.dsbak")
	CreateV1(v1, "a-long-passphrase", Manifest{SchemaVersion: 1}, []File{{Name: "dronstream.db", Data: []byte("x")}, {Name: "master.key", Data: make([]byte, 32)}})
	if a, err := OpenArchive(v1, "a-long-passphrase", dir); err != nil || a.Manifest.SchemaVersion != 1 {
		t.Fatalf("v1 compat: %v", err)
	}
}
