package secure

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"
)

// TOTP per RFC 6238 (HMAC-SHA1, 30 s step, 6 digits) — the parameters every
// common authenticator app supports. This is the standard algorithm, not a
// new construction.

const (
	TOTPStep   = 30
	totpDigits = 6
)

var b32 = base32.StdEncoding.WithPadding(base32.NoPadding)

// NewTOTPSecret returns 20 random bytes (160 bits, RFC 4226 recommendation).
func NewTOTPSecret() []byte {
	b := make([]byte, 20)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return b
}

func TOTPSecretBase32(secret []byte) string { return b32.EncodeToString(secret) }

// TOTPURI builds the otpauth:// URI that authenticator apps import (QR code).
func TOTPURI(secret []byte, issuer, account string) string {
	label := url.PathEscape(issuer + ":" + account)
	v := url.Values{}
	v.Set("secret", TOTPSecretBase32(secret))
	v.Set("issuer", issuer)
	v.Set("algorithm", "SHA1")
	v.Set("digits", fmt.Sprint(totpDigits))
	v.Set("period", fmt.Sprint(TOTPStep))
	return "otpauth://totp/" + label + "?" + v.Encode()
}

// HOTP per RFC 4226 with dynamic truncation.
func HOTP(secret []byte, counter uint64, digits int) string {
	var msg [8]byte
	binary.BigEndian.PutUint64(msg[:], counter)
	m := hmac.New(sha1.New, secret)
	m.Write(msg[:])
	sum := m.Sum(nil)
	off := sum[len(sum)-1] & 0x0f
	code := binary.BigEndian.Uint32(sum[off:off+4]) & 0x7fffffff
	mod := uint32(1)
	for i := 0; i < digits; i++ {
		mod *= 10
	}
	return fmt.Sprintf("%0*d", digits, code%mod)
}

func TOTPStepAt(t time.Time) int64 { return t.Unix() / TOTPStep }

// VerifyTOTP checks code against the steps now-1, now, now+1 (clock skew of
// one step) and returns the matching step. Steps <= lastStep are refused, so
// a code that was already used (or an older one) cannot be replayed.
func VerifyTOTP(secret []byte, code string, now time.Time, lastStep int64) (int64, bool) {
	code = strings.ReplaceAll(strings.TrimSpace(code), " ", "")
	if len(code) != totpDigits {
		return 0, false
	}
	cur := TOTPStepAt(now)
	for _, st := range []int64{cur - 1, cur, cur + 1} {
		if st <= lastStep || st < 0 {
			continue
		}
		if Equal([]byte(HOTP(secret, uint64(st), totpDigits)), []byte(code)) {
			return st, true
		}
	}
	return 0, false
}

// NewRecoveryCode returns a human-typable single-use code like "K7QD-4M2X-PB9T".
func NewRecoveryCode() string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O, 1/I
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	out := make([]byte, 0, 14)
	for i, c := range b {
		if i > 0 && i%4 == 0 {
			out = append(out, '-')
		}
		out = append(out, alphabet[int(c)%len(alphabet)])
	}
	return string(out)
}

// NormalizeRecoveryCode makes user input comparable to stored codes.
func NormalizeRecoveryCode(s string) string {
	s = strings.ToUpper(strings.TrimSpace(s))
	s = strings.NewReplacer(" ", "", "-", "").Replace(s)
	if len(s) != 12 {
		return ""
	}
	return s[0:4] + "-" + s[4:8] + "-" + s[8:12]
}

// NewVerifyCode returns a short code shown only to the waiting visitor. The
// administrator gets it from that person over a separate, trusted channel and
// types it; the admin API never returns it.
func NewVerifyCode() string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	out := make([]byte, 0, 7)
	for i, c := range b {
		if i == 3 {
			out = append(out, '-')
		}
		out = append(out, alphabet[int(c)%len(alphabet)])
	}
	return string(out)
}
