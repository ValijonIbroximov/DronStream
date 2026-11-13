// Package store owns the SQLite database: schema migrations and queries.
package store

import (
	crand "crypto/rand"
	"encoding/hex"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"path/filepath"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

var ErrNotFound = errors.New("not found")

type Store struct {
	DB   *sql.DB
	path string

	healthOnce sync.Once
	health     *sql.DB
	healthErr  error
}

// Open opens (and migrates) the database. Writes use BEGIN IMMEDIATE so the
// single SQLite writer serialises authorisation decisions (see ARCHITECTURE D8).
func Open(path string) (*Store, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}
	q := url.Values{}
	q.Add("_pragma", "busy_timeout(10000)")
	q.Add("_pragma", "journal_mode(WAL)")
	q.Add("_pragma", "foreign_keys(1)")
	q.Add("_pragma", "synchronous(NORMAL)")
	q.Set("_txlock", "immediate")
	dsn := "file:" + filepath.ToSlash(abs) + "?" + q.Encode()
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(8)
	db.SetConnMaxIdleTime(5 * time.Minute)
	s := &Store{DB: db, path: abs}
	if err := s.migrate(context.Background()); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error {
	if s.health != nil {
		s.health.Close()
	}
	return s.DB.Close()
}
func (s *Store) Path() string { return s.path }

// Ping performs a real read and a write-lock probe (BEGIN IMMEDIATE …
// ROLLBACK) on a dedicated connection with a 1 s busy timeout, so the
// watchdog detects an unusable database quickly instead of waiting on the
// normal 10 s busy timeout.
func (s *Store) Ping(ctx context.Context) error {
	s.healthOnce.Do(func() {
		q := url.Values{}
		q.Add("_pragma", "busy_timeout(1000)")
		q.Set("_txlock", "immediate")
		s.health, s.healthErr = sql.Open("sqlite", "file:"+filepath.ToSlash(s.path)+"?"+q.Encode())
		if s.health != nil {
			s.health.SetMaxOpenConns(1)
		}
	})
	if s.healthErr != nil {
		return s.healthErr
	}
	var n int
	if err := s.health.QueryRowContext(ctx, `SELECT count(*) FROM schema_version`).Scan(&n); err != nil {
		return err
	}
	tx, err := s.health.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	return tx.Rollback()
}

// Snapshot writes a transactionally consistent copy of the database to dst
// using VACUUM INTO (safe while the server is running).
func (s *Store) Snapshot(ctx context.Context, dst string) error {
	_, err := s.DB.ExecContext(ctx, `VACUUM INTO ?`, dst)
	return err
}

// Tx runs fn in a write transaction (BEGIN IMMEDIATE).
func (s *Store) Tx(ctx context.Context, fn func(tx *sql.Tx) error) error {
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

const schemaV1 = `
CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked')),
  must_change_password INTEGER NOT NULL DEFAULT 0,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY,
  display_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','ended')),
  created_at INTEGER NOT NULL,
  decided_at INTEGER,
  decided_by INTEGER,
  decision_note TEXT NOT NULL DEFAULT '',
  access_until INTEGER,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS web_sessions (
  id INTEGER PRIMARY KEY,
  token_hash BLOB NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('user','guest')),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES guests(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  revoked_at INTEGER,
  revoke_reason TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS ix_ws_user ON web_sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_ws_guest ON web_sessions(guest_id);
CREATE TABLE IF NOT EXISTS streams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  publish_mode TEXT NOT NULL DEFAULT 'query' CHECK (publish_mode IN ('query','path')),
  key_hash BLOB,
  key_enc BLOB,
  key_version INTEGER NOT NULL DEFAULT 0,
  key_set_at INTEGER,
  publish_enabled INTEGER NOT NULL DEFAULT 1,
  viewing_enabled INTEGER NOT NULL DEFAULT 1,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('user','guest')),
  subject_id INTEGER NOT NULL,
  stream_id INTEGER NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  granted_by INTEGER,
  granted_at INTEGER NOT NULL,
  expires_at INTEGER,
  revoked_at INTEGER,
  revoked_by INTEGER
);
CREATE INDEX IF NOT EXISTS ix_perm_subject ON permissions(subject_type, subject_id, stream_id);
CREATE TABLE IF NOT EXISTS playback_tickets (
  id INTEGER PRIMARY KEY,
  token_hash BLOB NOT NULL UNIQUE,
  web_session_id INTEGER NOT NULL REFERENCES web_sessions(id) ON DELETE CASCADE,
  stream_id INTEGER NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL UNIQUE,
  client_tab TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE TABLE IF NOT EXISTS media_sessions (
  id INTEGER PRIMARY KEY,
  mtx_id TEXT NOT NULL UNIQUE,
  nonce TEXT NOT NULL,
  ticket_id INTEGER,
  web_session_id INTEGER NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id INTEGER NOT NULL,
  stream_id INTEGER NOT NULL,
  client_tab TEXT NOT NULL DEFAULT '',
  whep_resource TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('pending','active','ended')),
  created_at INTEGER NOT NULL,
  established_at INTEGER,
  last_seen_at INTEGER NOT NULL,
  lease_expires_at INTEGER NOT NULL,
  ended_at INTEGER,
  end_reason TEXT NOT NULL DEFAULT '',
  remote_addr TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  bytes_sent INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_ms_status ON media_sessions(status);
CREATE INDEX IF NOT EXISTS ix_ms_ws ON media_sessions(web_session_id);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id INTEGER,
  actor_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS ix_audit_ts ON audit_log(ts);
`

func (s *Store) migrate(ctx context.Context) error {
	if _, err := s.DB.ExecContext(ctx, schemaV1); err != nil {
		return fmt.Errorf("schema: %w", err)
	}
	var v int
	err := s.DB.QueryRowContext(ctx, `SELECT version FROM schema_version LIMIT 1`).Scan(&v)
	if errors.Is(err, sql.ErrNoRows) {
		if _, err := s.DB.ExecContext(ctx, `INSERT INTO schema_version(version) VALUES (1)`); err != nil {
			return err
		}
		v = 1
	} else if err != nil {
		return err
	}
	if v > SchemaVersion {
		return fmt.Errorf("database schema v%d is newer than this program (v%d); use the matching version (rollback)", v, SchemaVersion)
	}
	defaults := map[string]string{
		"instance_id":          randomID(),
		"instance_state":       "active", // active | standby | migrated
		"emergency_stop":       "0",
		"guest_enabled":        "1",
		"guest_default_minutes": "120",
	}
	for k, val := range defaults {
		if _, err := s.DB.ExecContext(ctx, `INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)`, k, val); err != nil {
			return err
		}
	}
	return nil
}

const SchemaVersion = 1

func (s *Store) Setting(ctx context.Context, key string) (string, error) {
	var v string
	err := s.DB.QueryRowContext(ctx, `SELECT value FROM settings WHERE key=?`, key).Scan(&v)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	return v, err
}

func (s *Store) SetSetting(ctx context.Context, key, value string) error {
	_, err := s.DB.ExecContext(ctx, `INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, key, value)
	return err
}

func Now() int64 { return time.Now().UnixMilli() }

func NullInt(v *int64) any {
	if v == nil {
		return nil
	}
	return *v
}

func isUnique(err error) bool {
	return err != nil && strings.Contains(err.Error(), "UNIQUE")
}

var IsUnique = isUnique

func randomID() string {
	b := make([]byte, 12)
	if _, err := crand.Read(b); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b)
}

// NewInstanceID is used when a database is restored on a new machine.
func NewInstanceID() string { return randomID() }
