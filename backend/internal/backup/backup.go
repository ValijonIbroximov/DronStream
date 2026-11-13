// Package backup creates and restores encrypted, consistent backups.
//
// Archive file (.dsbak):
//   magic "DSBAK1\n" | uint32 t | uint32 mKiB | uint8 p | salt[16] | AES-256-GCM(nonce||ct) of a ZIP
// The key is Argon2id(passphrase, salt, t, m, p). The ZIP contains:
//   manifest.json, dronstream.db (VACUUM INTO snapshot), master.key (raw 32 B),
//   dronstream.yaml (if present), tls.crt / tls.key (if present), turn.secret (if present).
package backup

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"dronstream/internal/secure"
)

const magic = "DSBAK1\n"

type Manifest struct {
	Format        int       `json:"format"`
	AppVersion    string    `json:"appVersion"`
	SchemaVersion int       `json:"schemaVersion"`
	CreatedAt     time.Time `json:"createdAt"`
	Hostname      string    `json:"hostname"`
	InstanceID    string    `json:"instanceId"`
	OS            string    `json:"os"`
	ForMigration  bool      `json:"forMigration"`
	MediaFiles    int       `json:"mediaFiles"`
}

type File struct {
	Name string
	Path string // read from disk (optional)
	Data []byte
}

// CreateV1 writes the 1.0.x format (kept so compatibility can be tested).
func CreateV1(out string, pass string, m Manifest, files []File) error {
	if len([]rune(pass)) < 12 {
		return errors.New("backup passphrase must be at least 12 characters")
	}
	var zbuf bytes.Buffer
	zw := zip.NewWriter(&zbuf)
	mj, _ := json.MarshalIndent(m, "", "  ")
	files = append([]File{{Name: "manifest.json", Data: mj}}, files...)
	for _, f := range files {
		data := f.Data
		if f.Path != "" {
			b, err := os.ReadFile(f.Path)
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			if err != nil {
				return err
			}
			data = b
		}
		w, err := zw.CreateHeader(&zip.FileHeader{Name: f.Name, Method: zip.Deflate, Modified: time.Now()})
		if err != nil {
			return err
		}
		if _, err := w.Write(data); err != nil {
			return err
		}
	}
	if err := zw.Close(); err != nil {
		return err
	}
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return err
	}
	const t, mem, p = 3, 64 * 1024, 2
	key := secure.DeriveKey(pass, salt, t, mem, p)
	hdr := new(bytes.Buffer)
	hdr.WriteString(magic)
	binary.Write(hdr, binary.BigEndian, uint32(t))
	binary.Write(hdr, binary.BigEndian, uint32(mem))
	hdr.WriteByte(p)
	hdr.Write(salt)
	sealed, err := secure.Seal(key, zbuf.Bytes(), hdr.Bytes())
	if err != nil {
		return err
	}
	tmp := out + ".tmp"
	if err := os.MkdirAll(filepath.Dir(out), 0o700); err != nil {
		return err
	}
	if err := os.WriteFile(tmp, append(hdr.Bytes(), sealed...), 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, out)
}

// Open decrypts an archive and returns its files.
func Open(in, pass string) (*Manifest, map[string][]byte, error) {
	b, err := os.ReadFile(in)
	if err != nil {
		return nil, nil, err
	}
	hl := len(magic) + 4 + 4 + 1 + 16
	if len(b) < hl || string(b[:len(magic)]) != magic {
		return nil, nil, errors.New("not a DronStream backup file")
	}
	r := bytes.NewReader(b[len(magic):])
	var t, mem uint32
	binary.Read(r, binary.BigEndian, &t)
	binary.Read(r, binary.BigEndian, &mem)
	p, _ := r.ReadByte()
	salt := make([]byte, 16)
	io.ReadFull(r, salt)
	if t > 10 || mem > 1<<20 || p == 0 {
		return nil, nil, errors.New("invalid backup parameters")
	}
	key := secure.DeriveKey(pass, salt, t, mem, p)
	plain, err := secure.Open(key, b[hl:], b[:hl])
	if err != nil {
		return nil, nil, errors.New("wrong passphrase or corrupted backup")
	}
	zr, err := zip.NewReader(bytes.NewReader(plain), int64(len(plain)))
	if err != nil {
		return nil, nil, err
	}
	files := map[string][]byte{}
	for _, f := range zr.File {
		rc, err := f.Open()
		if err != nil {
			return nil, nil, err
		}
		data, err := io.ReadAll(io.LimitReader(rc, 4<<30))
		rc.Close()
		if err != nil {
			return nil, nil, err
		}
		files[f.Name] = data
	}
	var m Manifest
	if err := json.Unmarshal(files["manifest.json"], &m); err != nil {
		return nil, nil, fmt.Errorf("manifest: %w", err)
	}
	if _, ok := files["dronstream.db"]; !ok {
		return nil, nil, errors.New("backup has no database")
	}
	return &m, files, nil
}

func Hostname() string {
	h, _ := os.Hostname()
	return h
}

func OS() string { return runtime.GOOS + "/" + runtime.GOARCH }

// Snapshotter abstracts the live DB snapshot (VACUUM INTO).
type Snapshotter interface {
	Snapshot(ctx context.Context, dst string) error
}
