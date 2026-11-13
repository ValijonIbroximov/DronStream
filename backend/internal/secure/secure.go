// Package secure contains the crypto building blocks used by DronStream.
// Nothing here invents a protocol: Argon2id, SHA-256, AES-256-GCM and
// crypto/rand from the Go standard / x/crypto libraries.
package secure

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/argon2"
)

// Token returns n random bytes encoded as unpadded base64url.
func Token(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

// KeyToken returns a publish key: random, URL/RTMP-safe (letters+digits only,
// since some RTMP clients mangle '-' or '_').
func KeyToken(n int) string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
	b := make([]byte, n)
	out := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	for i := range b {
		// rejection-free mapping has a tiny bias; acceptable for 32 chars (>180 bits).
		out[i] = alphabet[int(b[i])%len(alphabet)]
	}
	return string(out)
}

func Hash(s string) []byte {
	h := sha256.Sum256([]byte(s))
	return h[:]
}

func Equal(a, b []byte) bool { return subtle.ConstantTimeCompare(a, b) == 1 }

// Argon2id parameters (RFC 9106 second recommended option, moderate memory).
const (
	argonTime    = 3
	argonMemory  = 64 * 1024
	argonThreads = 2
	argonKeyLen  = 32
)

func HashPassword(pw string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	k := argon2.IDKey([]byte(pw), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s", argonMemory, argonTime, argonThreads,
		base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(k)), nil
}

func VerifyPassword(encoded, pw string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false
	}
	var m, t uint32
	var p uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &m, &t, &p); err != nil {
		return false
	}
	salt, err1 := base64.RawStdEncoding.DecodeString(parts[4])
	want, err2 := base64.RawStdEncoding.DecodeString(parts[5])
	if err1 != nil || err2 != nil {
		return false
	}
	got := argon2.IDKey([]byte(pw), salt, t, m, p, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1
}

// dummyHash is used to equalise timing when a username does not exist.
var dummyHash, _ = HashPassword("timing-equaliser")

func BurnPasswordTime(pw string) { VerifyPassword(dummyHash, pw) }

// PasswordPolicy returns an Uzbek error message or "".
func PasswordPolicy(pw string) string {
	if len([]rune(pw)) < 10 {
		return "Parol kamida 10 belgidan iborat bo'lishi kerak"
	}
	if len(pw) > 256 {
		return "Parol juda uzun"
	}
	return ""
}

// Seal encrypts with AES-256-GCM; output = nonce || ciphertext.
func Seal(key, plaintext, aad []byte) ([]byte, error) {
	if len(key) != 32 {
		return nil, errors.New("key must be 32 bytes")
	}
	blk, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	g, err := cipher.NewGCM(blk)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, g.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return g.Seal(nonce, nonce, plaintext, aad), nil
}

func Open(key, sealed, aad []byte) ([]byte, error) {
	blk, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	g, err := cipher.NewGCM(blk)
	if err != nil {
		return nil, err
	}
	if len(sealed) < g.NonceSize() {
		return nil, errors.New("ciphertext too short")
	}
	return g.Open(nil, sealed[:g.NonceSize()], sealed[g.NonceSize():], aad)
}

// DeriveKey derives a 32-byte key from a passphrase (Argon2id) for backups.
func DeriveKey(pass string, salt []byte, t, mKiB uint32, p uint8) []byte {
	return argon2.IDKey([]byte(pass), salt, t, mKiB, p, 32)
}

// TURNCredentials implements the widely used "TURN REST API" scheme
// (coturn use-auth-secret): username = "<expiry-unix>:<label>",
// password = base64(HMAC-SHA1(secret, username)).
func TURNCredentials(secret, label string, ttl time.Duration) (user, pass string, exp time.Time) {
	exp = time.Now().Add(ttl)
	user = strconv.FormatInt(exp.Unix(), 10) + ":" + label
	m := hmac.New(sha1.New, []byte(secret))
	m.Write([]byte(user))
	pass = base64.StdEncoding.EncodeToString(m.Sum(nil))
	return
}

// Mask shows only the first 4 characters of a secret for logs/audit.
func Mask(s string) string {
	if len(s) <= 4 {
		return "****"
	}
	return s[:4] + "…(" + strconv.Itoa(len(s)) + ")"
}
