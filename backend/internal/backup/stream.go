package backup

import (
	"archive/zip"
	"bufio"
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"dronstream/internal/secure"
)

// Format v2 (DronStream 1.1.0) — streaming, for archives with large media:
//
//	"DSBAK2\n" | uint32 t | uint32 mKiB | uint8 p | salt[16] | noncePrefix[7]
//	then records: uint32 len | AES-256-GCM ciphertext (len bytes)
//
// Plaintext is a ZIP split into 1 MiB chunks. Chunk i uses nonce
// noncePrefix || uint32(i) || lastFlag (the standard "STREAM" construction
// used e.g. by age and Tink): reordering, truncation and appending are
// detected. AAD = the header. Key = Argon2id(passphrase, salt).
const magic2 = "DSBAK2\n"
const chunkSize = 1 << 20

type Dir struct {
	Prefix string // archive prefix, e.g. "media/"
	Path   string // directory on disk (regular files only, non-recursive)
}

type chunkWriter struct {
	w      io.Writer
	aead   cipher.AEAD
	prefix [7]byte
	ctr    uint32
	buf    []byte
	aad    []byte
}

func (c *chunkWriter) nonce(last bool) []byte {
	n := make([]byte, 12)
	copy(n, c.prefix[:])
	binary.BigEndian.PutUint32(n[7:11], c.ctr)
	if last {
		n[11] = 1
	}
	return n
}

func (c *chunkWriter) emit(p []byte, last bool) error {
	if c.ctr == ^uint32(0) {
		return errors.New("archive too large")
	}
	ct := c.aead.Seal(nil, c.nonce(last), p, c.aad)
	var l [4]byte
	binary.BigEndian.PutUint32(l[:], uint32(len(ct)))
	if _, err := c.w.Write(l[:]); err != nil {
		return err
	}
	if _, err := c.w.Write(ct); err != nil {
		return err
	}
	c.ctr++
	return nil
}

func (c *chunkWriter) Write(p []byte) (int, error) {
	n := len(p)
	for len(p) > 0 {
		k := chunkSize - len(c.buf)
		if k > len(p) {
			k = len(p)
		}
		c.buf = append(c.buf, p[:k]...)
		p = p[k:]
		if len(c.buf) == chunkSize {
			if err := c.emit(c.buf, false); err != nil {
				return 0, err
			}
			c.buf = c.buf[:0]
		}
	}
	return n, nil
}

func (c *chunkWriter) Close() error { return c.emit(c.buf, true) }

func newGCM(key []byte) (cipher.AEAD, error) {
	b, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewGCM(b)
}

// Create writes an encrypted v2 archive (streaming; memory use is bounded).
func Create(out string, pass string, m Manifest, files []File, dirs ...Dir) error {
	if len([]rune(pass)) < 12 {
		return errors.New("backup passphrase must be at least 12 characters")
	}
	if err := os.MkdirAll(filepath.Dir(out), 0o700); err != nil {
		return err
	}
	tmp := out + ".tmp"
	f, err := os.OpenFile(tmp, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	ok := false
	defer func() {
		if !ok {
			f.Close()
			os.Remove(tmp)
		}
	}()
	bw := bufio.NewWriterSize(f, 1<<20)
	salt := make([]byte, 16)
	rand.Read(salt)
	const t, mem, p = 3, 64 * 1024, 2
	hdr := new(bytes.Buffer)
	hdr.WriteString(magic2)
	binary.Write(hdr, binary.BigEndian, uint32(t))
	binary.Write(hdr, binary.BigEndian, uint32(mem))
	hdr.WriteByte(p)
	hdr.Write(salt)
	var prefix [7]byte
	rand.Read(prefix[:])
	hdr.Write(prefix[:])
	if _, err := bw.Write(hdr.Bytes()); err != nil {
		return err
	}
	aead, err := newGCM(secure.DeriveKey(pass, salt, t, mem, p))
	if err != nil {
		return err
	}
	cw := &chunkWriter{w: bw, aead: aead, prefix: prefix, aad: hdr.Bytes(), buf: make([]byte, 0, chunkSize)}
	zw := zip.NewWriter(cw)
	// count media for the manifest
	for _, d := range dirs {
		ents, _ := os.ReadDir(d.Path)
		for _, e := range ents {
			if e.Type().IsRegular() && !strings.HasSuffix(e.Name(), ".upload") {
				m.MediaFiles++
			}
		}
	}
	m.Format = 2
	mj, _ := json.MarshalIndent(m, "", "  ")
	add := func(name string, r io.Reader) error {
		w, err := zw.CreateHeader(&zip.FileHeader{Name: name, Method: zip.Deflate, Modified: time.Now()})
		if err != nil {
			return err
		}
		_, err = io.Copy(w, r)
		return err
	}
	if err := add("manifest.json", bytes.NewReader(mj)); err != nil {
		return err
	}
	for _, fl := range files {
		if fl.Path != "" {
			src, err := os.Open(fl.Path)
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			if err != nil {
				return err
			}
			err = add(fl.Name, src)
			src.Close()
			if err != nil {
				return err
			}
			continue
		}
		if err := add(fl.Name, bytes.NewReader(fl.Data)); err != nil {
			return err
		}
	}
	for _, d := range dirs {
		ents, err := os.ReadDir(d.Path)
		if err != nil && !errors.Is(err, os.ErrNotExist) {
			return err
		}
		for _, e := range ents {
			if !e.Type().IsRegular() || strings.HasSuffix(e.Name(), ".upload") {
				continue
			}
			src, err := os.Open(filepath.Join(d.Path, e.Name()))
			if err != nil {
				return err
			}
			// media is already compressed: store, don't deflate
			w, err := zw.CreateHeader(&zip.FileHeader{Name: d.Prefix + e.Name(), Method: zip.Store, Modified: time.Now()})
			if err == nil {
				_, err = io.Copy(w, src)
			}
			src.Close()
			if err != nil {
				return err
			}
		}
	}
	if err := zw.Close(); err != nil {
		return err
	}
	if err := cw.Close(); err != nil {
		return err
	}
	if err := bw.Flush(); err != nil {
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}
	ok = true
	return os.Rename(tmp, out)
}

// Archive is an opened (decrypted) backup.
type Archive struct {
	Manifest *Manifest
	Small    map[string][]byte // everything except the DB and media
	zr       *zip.ReadCloser
	v1       map[string][]byte
	tmp      string
}

func (a *Archive) Close() {
	if a.zr != nil {
		a.zr.Close()
	}
	if a.tmp != "" {
		os.Remove(a.tmp)
	}
}

// WriteDB extracts dronstream.db to dst.
func (a *Archive) WriteDB(dst string) error {
	if a.v1 != nil {
		return os.WriteFile(dst, a.v1["dronstream.db"], 0o600)
	}
	for _, f := range a.zr.File {
		if f.Name == "dronstream.db" {
			return extract(f, dst)
		}
	}
	return errors.New("backup has no database")
}

// ExtractMedia writes media/* entries into dir. Returns the count.
func (a *Archive) ExtractMedia(dir string) (int, error) {
	if a.zr == nil {
		return 0, nil
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return 0, err
	}
	n := 0
	for _, f := range a.zr.File {
		if !strings.HasPrefix(f.Name, "media/") {
			continue
		}
		name := strings.TrimPrefix(f.Name, "media/")
		if name == "" || strings.ContainsAny(name, `/\:`) || strings.Contains(name, "..") {
			return n, fmt.Errorf("unsafe media entry %q", f.Name)
		}
		if err := extract(f, filepath.Join(dir, name)); err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}

func extract(f *zip.File, dst string) error {
	rc, err := f.Open()
	if err != nil {
		return err
	}
	defer rc.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, rc); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}

// OpenArchive decrypts a v1 or v2 backup. v2 is decrypted to a temporary
// file inside tmpDir (which must be on a protected disk location).
func OpenArchive(in, pass, tmpDir string) (*Archive, error) {
	f, err := os.Open(in)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	head := make([]byte, len(magic2))
	if _, err := io.ReadFull(f, head); err != nil {
		return nil, errors.New("not a DronStream backup file")
	}
	if string(head) == magic {
		m, files, err := Open(in, pass)
		if err != nil {
			return nil, err
		}
		small := map[string][]byte{}
		for k, v := range files {
			if k != "dronstream.db" {
				small[k] = v
			}
		}
		return &Archive{Manifest: m, Small: small, v1: files}, nil
	}
	if string(head) != magic2 {
		return nil, errors.New("not a DronStream backup file")
	}
	rest := make([]byte, 4+4+1+16+7)
	if _, err := io.ReadFull(f, rest); err != nil {
		return nil, errors.New("corrupted backup header")
	}
	hdr := append(head, rest...)
	t := binary.BigEndian.Uint32(rest[0:4])
	mem := binary.BigEndian.Uint32(rest[4:8])
	p := rest[8]
	salt := rest[9:25]
	var prefix [7]byte
	copy(prefix[:], rest[25:32])
	if t == 0 || t > 10 || mem > 1<<20 || p == 0 {
		return nil, errors.New("invalid backup parameters")
	}
	aead, err := newGCM(secure.DeriveKey(pass, salt, t, mem, p))
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(tmpDir, 0o700); err != nil {
		return nil, err
	}
	tf, err := os.CreateTemp(tmpDir, "restore-*.zip")
	if err != nil {
		return nil, err
	}
	tmp := tf.Name()
	fail := func(e error) (*Archive, error) { tf.Close(); os.Remove(tmp); return nil, e }
	br := bufio.NewReaderSize(f, 1<<20)
	cw := &chunkWriter{prefix: prefix}
	sawLast := false
	for {
		var l [4]byte
		if _, err := io.ReadFull(br, l[:]); err != nil {
			if err == io.EOF && sawLast {
				break
			}
			return fail(errors.New("corrupted or truncated backup"))
		}
		if sawLast {
			return fail(errors.New("corrupted backup (data after final chunk)"))
		}
		n := binary.BigEndian.Uint32(l[:])
		if n > chunkSize+64 {
			return fail(errors.New("corrupted backup (chunk size)"))
		}
		ct := make([]byte, n)
		if _, err := io.ReadFull(br, ct); err != nil {
			return fail(errors.New("corrupted or truncated backup"))
		}
		pt, err := aead.Open(nil, cw.nonce(false), ct, hdr)
		if err != nil {
			pt, err = aead.Open(nil, cw.nonce(true), ct, hdr)
			if err != nil {
				if cw.ctr == 0 {
					return fail(errors.New("wrong passphrase or corrupted backup"))
				}
				return fail(errors.New("corrupted backup (authentication failed)"))
			}
			sawLast = true
		}
		if _, err := tf.Write(pt); err != nil {
			return fail(err)
		}
		cw.ctr++
	}
	if err := tf.Close(); err != nil {
		return fail(err)
	}
	zr, err := zip.OpenReader(tmp)
	if err != nil {
		os.Remove(tmp)
		return nil, err
	}
	a := &Archive{zr: zr, tmp: tmp, Small: map[string][]byte{}}
	for _, zf := range zr.File {
		if zf.Name == "dronstream.db" || strings.HasPrefix(zf.Name, "media/") {
			continue
		}
		rc, err := zf.Open()
		if err != nil {
			a.Close()
			return nil, err
		}
		b, err := io.ReadAll(io.LimitReader(rc, 16<<20))
		rc.Close()
		if err != nil {
			a.Close()
			return nil, err
		}
		a.Small[zf.Name] = b
	}
	var m Manifest
	if err := json.Unmarshal(a.Small["manifest.json"], &m); err != nil {
		a.Close()
		return nil, fmt.Errorf("manifest: %w", err)
	}
	a.Manifest = &m
	return a, nil
}
