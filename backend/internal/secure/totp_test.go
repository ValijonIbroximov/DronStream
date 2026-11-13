package secure

import (
	"strings"
	"testing"
	"time"
)

// RFC 6238 Appendix B test vectors (SHA1, 8 digits) and RFC 4226 Appendix D.
func TestHOTPAndTOTPVectors(t *testing.T) {
	secret := []byte("12345678901234567890")
	hotp := []string{"755224", "287082", "359152", "969429", "338314", "254676", "287922", "162583", "399871", "520489"}
	for i, want := range hotp {
		if got := HOTP(secret, uint64(i), 6); got != want {
			t.Fatalf("HOTP(%d)=%s want %s", i, got, want)
		}
	}
	for _, v := range []struct {
		t    int64
		want string
	}{{59, "94287082"}, {1111111109, "07081804"}, {1111111111, "14050471"}, {1234567890, "89005924"}, {2000000000, "69279037"}, {20000000000, "65353130"}} {
		if got := HOTP(secret, uint64(v.t/30), 8); got != v.want {
			t.Fatalf("TOTP(%d)=%s want %s", v.t, got, v.want)
		}
	}
}

func TestVerifyTOTPWindowAndReplay(t *testing.T) {
	secret := NewTOTPSecret()
	now := time.Unix(1_800_000_000, 0)
	cur := TOTPStepAt(now)
	code := HOTP(secret, uint64(cur), 6)
	st, ok := VerifyTOTP(secret, code, now, 0)
	if !ok || st != cur {
		t.Fatal("current code refused")
	}
	if _, ok := VerifyTOTP(secret, code, now, st); ok {
		t.Fatal("replayed code accepted")
	}
	prev := HOTP(secret, uint64(cur-1), 6)
	if _, ok := VerifyTOTP(secret, prev, now, 0); !ok {
		t.Fatal("one step of clock skew refused")
	}
	old := HOTP(secret, uint64(cur-3), 6)
	if _, ok := VerifyTOTP(secret, old, now, 0); ok {
		t.Fatal("old code accepted")
	}
	if _, ok := VerifyTOTP(secret, "12345", now, 0); ok {
		t.Fatal("short code accepted")
	}
	uri := TOTPURI(secret, "DronStream", "boss")
	if !strings.HasPrefix(uri, "otpauth://totp/DronStream:boss?") || !strings.Contains(uri, "secret="+TOTPSecretBase32(secret)) {
		t.Fatalf("uri %s", uri)
	}
}

func TestRecoveryAndVerifyCodes(t *testing.T) {
	c := NewRecoveryCode()
	if len(c) != 14 || NormalizeRecoveryCode(strings.ToLower(strings.ReplaceAll(c, "-", " "))) != c {
		t.Fatalf("recovery code %q", c)
	}
	if NormalizeRecoveryCode("abc") != "" {
		t.Fatal("bad recovery input accepted")
	}
	if v := NewVerifyCode(); len(v) != 7 || v[3] != '-' {
		t.Fatalf("verify code %q", v)
	}
}
