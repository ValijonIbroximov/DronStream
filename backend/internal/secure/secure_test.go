package secure

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"os"
	"strings"
	"testing"
	"time"
)

func TestPasswordHash(t *testing.T) {
	h, err := HashPassword("Correct-Horse-1")
	if err != nil || !strings.HasPrefix(h, "$argon2id$v=19$m=65536,t=3,p=2$") {
		t.Fatalf("hash %q %v", h, err)
	}
	if !VerifyPassword(h, "Correct-Horse-1") || VerifyPassword(h, "correct-horse-1") {
		t.Fatal("verify")
	}
	h2, _ := HashPassword("Correct-Horse-1")
	if h == h2 {
		t.Fatal("salt not random")
	}
}

func TestSealOpen(t *testing.T) {
	k := bytes.Repeat([]byte{7}, 32)
	c, err := Seal(k, []byte("secret"), []byte("aad"))
	if err != nil {
		t.Fatal(err)
	}
	if p, err := Open(k, c, []byte("aad")); err != nil || string(p) != "secret" {
		t.Fatal("open")
	}
	if _, err := Open(k, c, []byte("other")); err == nil {
		t.Fatal("aad not bound")
	}
}

func TestTURNCredentialsFormat(t *testing.T) {
	u, p, exp := TURNCredentials("s3cret", "s1", 10*time.Minute)
	if !strings.HasSuffix(u, ":s1") || exp.Before(time.Now()) {
		t.Fatal(u)
	}
	m := hmac.New(sha1.New, []byte("s3cret"))
	m.Write([]byte(u))
	if base64.StdEncoding.EncodeToString(m.Sum(nil)) != p {
		t.Fatal("hmac mismatch (coturn use-auth-secret compatibility)")
	}
}

func TestMasterKeyRoundTrip(t *testing.T) {
	dir := t.TempDir()
	k1, err := LoadOrCreateMasterKey(dir)
	if err != nil {
		t.Fatal(err)
	}
	k2, err := LoadOrCreateMasterKey(dir)
	if err != nil || !bytes.Equal(k1, k2) {
		t.Fatal("reload")
	}
	raw, _ := os.ReadFile(MasterKeyPath(dir))
	if bytes.Contains(raw, k1) {
		t.Log("note: master key stored without DPAPI on this platform")
	}
}

func TestKeyTokenAlphabet(t *testing.T) {
	k := KeyToken(32)
	if len(k) != 32 || strings.ContainsAny(k, "-_/+=?&") {
		t.Fatal(k)
	}
}
