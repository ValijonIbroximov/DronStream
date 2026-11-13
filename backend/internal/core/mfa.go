package core

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"dronstream/internal/secure"
)

// Second factor for accounts (RFC 6238 TOTP) and re-confirmation of
// sensitive administrator actions.
//
// The TOTP secret is AES-GCM encrypted with the master key (which lives
// outside the database, DPAPI- or file-mode-protected), so a copy of the
// database alone does not reveal it. Recovery codes are stored as SHA-256
// hashes and work once.

// ReauthWindow is how long a password(+TOTP) confirmation stays valid for
// sensitive actions (key reveal/rotation, admin accounts, instance state...).
const ReauthWindow = 10 * time.Minute

const recoveryCodeCount = 10

func totpAAD(uid int64) []byte { return []byte("totp:" + itoa(uid)) }

// TOTPSetup creates a new (not yet active) secret for the session's user.
// The previous secret, if any, stays active until TOTPEnable succeeds.
func (s *Service) TOTPSetup(ctx context.Context, sess *Session) (secretB32, uri string, err error) {
	if sess.Kind != "user" {
		return "", "", ErrForbidden
	}
	sec := secure.NewTOTPSecret()
	enc, err := secure.Seal(s.MasterKey, sec, totpAAD(sess.UserID))
	if err != nil {
		return "", "", err
	}
	if _, err := s.St.DB.ExecContext(ctx, `UPDATE users SET totp_pending_enc=? WHERE id=?`, enc, sess.UserID); err != nil {
		return "", "", err
	}
	account := sess.Username
	if account == "" {
		account = "user" + itoa(sess.UserID)
	}
	s.Audit(ctx, sess.Actor(sess.IP), "totp_setup_started", "user:"+account, nil)
	return secure.TOTPSecretBase32(sec), secure.TOTPURI(sec, "DronStream", account), nil
}

// TOTPEnable activates the pending secret after the user proves they can
// generate codes with it, and returns fresh recovery codes (shown once).
func (s *Service) TOTPEnable(ctx context.Context, sess *Session, code string) ([]string, error) {
	if sess.Kind != "user" {
		return nil, ErrForbidden
	}
	var pending []byte
	if err := s.St.DB.QueryRowContext(ctx, `SELECT totp_pending_enc FROM users WHERE id=?`, sess.UserID).Scan(&pending); err != nil || len(pending) == 0 {
		return nil, errf(409, "totp_no_pending", "Avval yangi kalit yarating (QR kod)")
	}
	sec, err := secure.Open(s.MasterKey, pending, totpAAD(sess.UserID))
	if err != nil {
		return nil, err
	}
	step, ok := secure.VerifyTOTP(sec, code, time.UnixMilli(s.nowMs()), 0)
	if !ok {
		return nil, errf(400, "totp_bad_code", "Kod mos emas. Ilovadagi joriy 6 xonali kodni kiriting (telefon soati to'g'ri bo'lishi kerak)")
	}
	codes := make([]string, recoveryCodeCount)
	err = s.St.Tx(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `UPDATE users SET totp_enc=totp_pending_enc, totp_pending_enc=NULL, totp_enabled=1, totp_last_step=? WHERE id=?`, step, sess.UserID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `DELETE FROM recovery_codes WHERE user_id=?`, sess.UserID); err != nil {
			return err
		}
		now := s.nowMs()
		for i := range codes {
			codes[i] = secure.NewRecoveryCode()
			if _, err := tx.ExecContext(ctx, `INSERT INTO recovery_codes(user_id,code_hash,created_at) VALUES(?,?,?)`, sess.UserID, secure.Hash(codes[i]), now); err != nil {
				return err
			}
		}
		s.auditExec(ctx, tx, sess.Actor(sess.IP), "totp_enabled", "user:"+sess.Username, nil)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return codes, nil
}

// TOTPDisable turns the second factor off (the web layer requires a fresh
// re-confirmation first). Recovery codes are deleted.
func (s *Service) TOTPDisable(ctx context.Context, a Actor, userID int64) error {
	err := s.St.Tx(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `UPDATE users SET totp_enc=NULL, totp_pending_enc=NULL, totp_enabled=0, totp_last_step=0 WHERE id=?`, userID); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `DELETE FROM recovery_codes WHERE user_id=?`, userID)
		if err == nil {
			s.auditExec(ctx, tx, a, "totp_disabled", "user:"+itoa(userID), nil)
		}
		return err
	})
	return err
}

// RecoveryCodesLeft reports how many unused recovery codes the user has.
func (s *Service) RecoveryCodesLeft(ctx context.Context, userID int64) int {
	var n int
	s.St.DB.QueryRowContext(ctx, `SELECT count(*) FROM recovery_codes WHERE user_id=? AND used_at IS NULL`, userID).Scan(&n)
	return n
}

// checkSecondFactor verifies a TOTP code (refusing replays) or consumes one
// recovery code. Atomic per user (single SQLite writer).
func (s *Service) checkSecondFactor(ctx context.Context, userID int64, code string) (ok bool, usedRecovery bool) {
	code = strings.TrimSpace(code)
	if code == "" {
		return false, false
	}
	err := s.St.Tx(ctx, func(tx *sql.Tx) error {
		var enc []byte
		var last int64
		if err := tx.QueryRowContext(ctx, `SELECT totp_enc, totp_last_step FROM users WHERE id=? AND totp_enabled=1`, userID).Scan(&enc, &last); err != nil {
			return nil
		}
		if rc := secure.NormalizeRecoveryCode(code); rc != "" {
			res, err := tx.ExecContext(ctx, `UPDATE recovery_codes SET used_at=? WHERE user_id=? AND code_hash=? AND used_at IS NULL`, s.nowMs(), userID, secure.Hash(rc))
			if err != nil {
				return err
			}
			if n, _ := res.RowsAffected(); n == 1 {
				ok, usedRecovery = true, true
			}
			return nil
		}
		sec, err := secure.Open(s.MasterKey, enc, totpAAD(userID))
		if err != nil {
			return nil
		}
		step, good := secure.VerifyTOTP(sec, code, time.UnixMilli(s.nowMs()), last)
		if !good {
			return nil
		}
		_, err = tx.ExecContext(ctx, `UPDATE users SET totp_last_step=? WHERE id=?`, step, userID)
		ok = err == nil
		return err
	})
	if err != nil {
		return false, false
	}
	return ok, usedRecovery
}

// Reauth re-confirms the signed-in user (password, plus TOTP when enabled)
// and records the time on this browser session only.
func (s *Service) Reauth(ctx context.Context, sess *Session, password, otp, ip string) error {
	if sess.Kind != "user" {
		return ErrForbidden
	}
	var hash string
	var totp bool
	if err := s.St.DB.QueryRowContext(ctx, `SELECT password_hash, totp_enabled FROM users WHERE id=?`, sess.UserID).Scan(&hash, &totp); err != nil {
		return ErrUnauthorized
	}
	if !secure.VerifyPassword(hash, password) {
		s.Audit(ctx, sess.Actor(ip), "reauth_failed", "user:"+sess.Username, map[string]any{"reason": "bad_password"})
		return errf(403, "reauth_failed", "Parol noto'g'ri")
	}
	if totp {
		if otp == "" {
			return errf(401, "mfa_required", "Ikkinchi bosqich kodi kerak (autentifikator ilovasi yoki tiklash kodi)")
		}
		if ok, rec := s.checkSecondFactor(ctx, sess.UserID, otp); !ok {
			s.Audit(ctx, sess.Actor(ip), "reauth_failed", "user:"+sess.Username, map[string]any{"reason": "bad_otp"})
			return errf(403, "reauth_failed", "Kod noto'g'ri yoki allaqachon ishlatilgan")
		} else if rec {
			s.Audit(ctx, sess.Actor(ip), "recovery_code_used", "user:"+sess.Username, map[string]any{"left": s.RecoveryCodesLeft(ctx, sess.UserID)})
		}
	}
	now := s.nowMs()
	if _, err := s.St.DB.ExecContext(ctx, `UPDATE web_sessions SET reauth_at=? WHERE id=?`, now, sess.ID); err != nil {
		return err
	}
	sess.ReauthAt = now
	s.Audit(ctx, sess.Actor(ip), "reauth", "user:"+sess.Username, nil)
	return nil
}

// RecentReauth tells whether the session re-confirmed within ReauthWindow.
func (s *Service) RecentReauth(sess *Session) bool {
	return sess.Kind == "user" && sess.ReauthAt > 0 && s.nowMs()-sess.ReauthAt <= ReauthWindow.Milliseconds()
}

// AdminsWithoutTOTP counts active administrators without a second factor.
func (s *Service) AdminsWithoutTOTP(ctx context.Context) int {
	var n int
	s.St.DB.QueryRowContext(ctx, `SELECT count(*) FROM users WHERE role='admin' AND status='active' AND totp_enabled=0`).Scan(&n)
	return n
}
