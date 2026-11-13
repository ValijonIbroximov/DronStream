package store

import (
	"context"
	"fmt"
)

// Schema v3 (DronStream 1.3.0): "a link is only an invitation".
//   - web_sessions.approval: for link sessions the administrator approves the
//     exact browser session ('pending' | 'approved' | 'rejected'; ” = not
//     applicable). Existing link sessions become 'pending': under the new
//     policy nobody keeps video access only because they held the link.
//   - web_sessions.verify_code: short code shown to the visitor and to the
//     admin so they can compare it over a separate trusted channel.
//   - web_sessions.reauth_at: last password(+TOTP) re-confirmation, needed
//     for sensitive admin actions.
//   - users.totp_enc / totp_pending_enc / totp_enabled / totp_last_step:
//     RFC 6238 second factor; the secret is AES-GCM encrypted with the master
//     key (outside the database).
//   - recovery_codes: single-use, hashed admin recovery codes.
//   - access_links.uses_count now counts APPROVED activations; existing
//     counts stay (they were real uses).
const schemaV3 = `
ALTER TABLE web_sessions ADD COLUMN approval TEXT NOT NULL DEFAULT '';
ALTER TABLE web_sessions ADD COLUMN verify_code TEXT NOT NULL DEFAULT '';
ALTER TABLE web_sessions ADD COLUMN approved_by INTEGER;
ALTER TABLE web_sessions ADD COLUMN approved_at INTEGER;
ALTER TABLE web_sessions ADD COLUMN reauth_at INTEGER NOT NULL DEFAULT 0;
UPDATE web_sessions SET approval='pending' WHERE kind='link';
UPDATE web_sessions SET approval='approved' WHERE kind='guest' AND guest_id IN (SELECT id FROM guests WHERE status='approved');
UPDATE web_sessions SET approval='pending' WHERE kind='guest' AND approval='';
UPDATE web_sessions SET verify_code=substr(hex(randomblob(3)),1,3)||'-'||substr(hex(randomblob(3)),1,3) WHERE approval='pending' AND verify_code='';
ALTER TABLE link_activations ADD COLUMN approved INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN totp_enc BLOB;
ALTER TABLE users ADD COLUMN totp_pending_enc BLOB;
ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN totp_last_step INTEGER NOT NULL DEFAULT 0;
CREATE TABLE recovery_codes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash BLOB NOT NULL,
  created_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX ix_recovery_user ON recovery_codes(user_id);
INSERT OR REPLACE INTO settings(key,value) VALUES('link_policy_migrated','1');
UPDATE schema_version SET version = 3;
`

func (s *Store) migrateV3(ctx context.Context) error {
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, schemaV3); err != nil {
		return fmt.Errorf("migrate v3: %w", err)
	}
	return tx.Commit()
}
