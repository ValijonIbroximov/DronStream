package core

import (
	"context"
	"encoding/base32"
	"testing"
	"time"

	"dronstream/internal/secure"
)

func totpNow(t *testing.T, secretB32 string, at time.Time) string {
	t.Helper()
	sec, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(secretB32)
	if err != nil {
		t.Fatal(err)
	}
	return secure.HOTP(sec, uint64(secure.TOTPStepAt(at)), 6)
}

func TestTOTPLoginRecoveryAndReauth(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	clock := time.Unix(1_900_000_000, 0)
	s.Now = func() time.Time { return clock }
	_, sess, _ := mustUser(t, s, "boss", "admin")
	sess.Username = "boss"

	secret, uri, err := s.TOTPSetup(ctx, sess)
	if err != nil || uri == "" {
		t.Fatal(err)
	}
	// pending secret is not active yet: password alone still works
	if _, _, err := s.Login(ctx, "boss", "Password-123456", "", ""); err != nil {
		t.Fatalf("login before enabling: %v", err)
	}
	if _, err := s.TOTPEnable(ctx, sess, "000000"); err == nil {
		t.Fatal("wrong code enabled TOTP")
	}
	codes, err := s.TOTPEnable(ctx, sess, totpNow(t, secret, clock))
	if err != nil || len(codes) != 10 {
		t.Fatalf("enable: %v %d", err, len(codes))
	}
	// the secret is stored encrypted, never as plain base32
	var enc []byte
	s.St.DB.QueryRow(`SELECT totp_enc FROM users WHERE username='boss'`).Scan(&enc)
	if len(enc) == 0 || string(enc) == secret {
		t.Fatal("TOTP secret not stored encrypted")
	}

	if _, _, err := s.Login(ctx, "boss", "Password-123456", "", ""); errCode(err) != "mfa_required" {
		t.Fatalf("password alone: %v", err)
	}
	clock = clock.Add(31 * time.Second) // next step (the enabling code's step is spent)
	code := totpNow(t, secret, clock)
	if _, _, err := s.LoginOTP(ctx, "boss", "Password-123456", code, "", ""); err != nil {
		t.Fatalf("login with code: %v", err)
	}
	if _, _, err := s.LoginOTP(ctx, "boss", "Password-123456", code, "", ""); errCode(err) != "bad_otp" {
		t.Fatalf("replayed code: %v", err)
	}
	if _, _, err := s.LoginOTP(ctx, "boss", "Password-123456", codes[0], "", ""); err != nil {
		t.Fatalf("recovery code: %v", err)
	}
	if _, _, err := s.LoginOTP(ctx, "boss", "Password-123456", codes[0], "", ""); errCode(err) != "bad_otp" {
		t.Fatalf("recovery code reused: %v", err)
	}
	if s.RecoveryCodesLeft(ctx, sess.UserID) != 9 {
		t.Fatal("recovery code count")
	}
	if _, _, err := s.LoginOTP(ctx, "boss", "wrong-password-xx", totpNow(t, secret, clock.Add(30*time.Second)), "", ""); err == nil {
		t.Fatal("wrong password accepted with a valid code")
	}

	// re-confirmation for sensitive actions
	clock = clock.Add(ReauthWindow + time.Minute)
	if s.RecentReauth(sess) {
		t.Fatal("old login counted as fresh re-confirmation")
	}
	if err := s.Reauth(ctx, sess, "Password-123456", "", ""); errCode(err) != "mfa_required" {
		t.Fatalf("reauth without code: %v", err)
	}
	clock = clock.Add(31 * time.Second)
	if err := s.Reauth(ctx, sess, "Password-123456", totpNow(t, secret, clock), ""); err != nil {
		t.Fatal(err)
	}
	if !s.RecentReauth(sess) {
		t.Fatal("reauth not recorded")
	}
	if s.AdminsWithoutTOTP(ctx) != 0 {
		t.Fatal("admin without TOTP counted")
	}
	if err := s.TOTPDisable(ctx, admin, sess.UserID); err != nil || s.AdminsWithoutTOTP(ctx) != 1 {
		t.Fatal("disable")
	}
}
