package store

import (
	"context"
	"fmt"
)

// Schema v2 (DronStream 1.1.0):
//   - contents: one library of items (live stream | text | image | video) with
//     viewer-facing title, description, visibility and order. Every existing
//     stream gets a "stream" content row (title = old stream name).
//   - collections + collection_items ("To'plam").
//   - grants: (user|guest|link) x (content|collection) with expiry; replaces
//     the v1 permissions table (rows are migrated 1:1 to content grants).
//   - access_links + link_activations: login-free special links.
//   - web_sessions gains kind 'link' and link_id/activation_id (table rebuild;
//     SQLite cannot alter a CHECK constraint in place).
//   - media_sessions gains no columns; file transfers are tracked in memory.
const schemaV2 = `
CREATE TABLE access_links (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  preset TEXT NOT NULL CHECK (preset IN ('once','multi','timed','custom')),
  token_hash BLOB NOT NULL UNIQUE,
  token_enc BLOB NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 1,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  max_parallel INTEGER,
  starts_at INTEGER,
  ends_at INTEGER,
  session_minutes INTEGER NOT NULL,
  for_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  created_by INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  revoked_at INTEGER,
  revoked_by INTEGER
);
CREATE TABLE link_activations (
  id INTEGER PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES access_links(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  session_id INTEGER,
  created_at INTEGER NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  UNIQUE(link_id, request_id)
);
CREATE TABLE web_sessions_v2 (
  id INTEGER PRIMARY KEY,
  token_hash BLOB NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('user','guest','link')),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES guests(id) ON DELETE CASCADE,
  link_id INTEGER REFERENCES access_links(id) ON DELETE CASCADE,
  activation_id INTEGER,
  csrf_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  revoked_at INTEGER,
  revoke_reason TEXT NOT NULL DEFAULT ''
);
INSERT INTO web_sessions_v2(id,token_hash,kind,user_id,guest_id,csrf_token,created_at,last_seen_at,expires_at,ip,user_agent,revoked_at,revoke_reason)
  SELECT id,token_hash,kind,user_id,guest_id,csrf_token,created_at,last_seen_at,expires_at,ip,user_agent,revoked_at,revoke_reason FROM web_sessions;
DROP TABLE web_sessions;
ALTER TABLE web_sessions_v2 RENAME TO web_sessions;
CREATE INDEX ix_ws_user ON web_sessions(user_id);
CREATE INDEX ix_ws_guest ON web_sessions(guest_id);
CREATE INDEX ix_ws_link ON web_sessions(link_id);

CREATE TABLE contents (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('stream','text','image','video')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  stream_id INTEGER UNIQUE REFERENCES streams(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  file_id TEXT NOT NULL DEFAULT '',
  mime TEXT NOT NULL DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  codec TEXT NOT NULL DEFAULT '',
  has_thumb INTEGER NOT NULL DEFAULT 0,
  sha256 TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE collections (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE collection_items (
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  content_id INTEGER NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  item_title TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at INTEGER NOT NULL,
  PRIMARY KEY (collection_id, content_id)
);
CREATE TABLE grants (
  id INTEGER PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('user','guest','link')),
  subject_id INTEGER NOT NULL,
  object_type TEXT NOT NULL CHECK (object_type IN ('content','collection')),
  object_id INTEGER NOT NULL,
  include_future INTEGER NOT NULL DEFAULT 0,
  source_collection_id INTEGER,
  granted_by INTEGER,
  granted_at INTEGER NOT NULL,
  expires_at INTEGER,
  revoked_at INTEGER,
  revoked_by INTEGER
);
CREATE INDEX ix_grants_subject ON grants(subject_type, subject_id);
CREATE INDEX ix_grants_object ON grants(object_type, object_id);

INSERT INTO contents(type,title,description,visible,sort_order,stream_id,created_at,updated_at)
  SELECT 'stream', name, description, 1, id, id, created_at, updated_at FROM streams;
INSERT INTO grants(subject_type,subject_id,object_type,object_id,granted_by,granted_at,expires_at,revoked_at,revoked_by)
  SELECT p.subject_type, p.subject_id, 'content', c.id, p.granted_by, p.granted_at, p.expires_at, p.revoked_at, p.revoked_by
  FROM permissions p JOIN contents c ON c.stream_id = p.stream_id;
DROP TABLE permissions;
UPDATE schema_version SET version = 2;
`

// migrateV2 runs the v1->v2 migration on one connection with foreign keys
// disabled (required for the table rebuild), inside a single transaction.
func (s *Store) migrateV2(ctx context.Context) error {
	conn, err := s.DB.Conn(ctx)
	if err != nil {
		return err
	}
	defer conn.Close()
	if _, err := conn.ExecContext(ctx, `PRAGMA foreign_keys=OFF`); err != nil {
		return err
	}
	defer conn.ExecContext(context.Background(), `PRAGMA foreign_keys=ON`)
	if _, err := conn.ExecContext(ctx, `BEGIN IMMEDIATE`); err != nil {
		return err
	}
	if _, err := conn.ExecContext(ctx, schemaV2); err != nil {
		conn.ExecContext(context.Background(), `ROLLBACK`)
		return fmt.Errorf("migration v2: %w", err)
	}
	// Verify referential integrity before committing.
	rows, err := conn.QueryContext(ctx, `PRAGMA foreign_key_check`)
	if err != nil {
		conn.ExecContext(context.Background(), `ROLLBACK`)
		return err
	}
	bad := 0
	for rows.Next() {
		bad++
	}
	rows.Close()
	if bad > 0 {
		conn.ExecContext(context.Background(), `ROLLBACK`)
		return fmt.Errorf("migration v2: %d foreign key violations; database left unchanged", bad)
	}
	_, err = conn.ExecContext(ctx, `COMMIT`)
	return err
}
