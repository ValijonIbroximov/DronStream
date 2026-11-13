// Package core implements DronStream's domain rules: accounts, guest
// requests, sessions, streams, permissions, playback tickets, media-session
// authorisation and audit. All authorisation decisions are made here, on the
// server, from the database state (never from frontend state).
package core

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log/slog"
	"sync"
	"time"

	"dronstream/internal/config"
	"dronstream/internal/store"
)

// Error is a user-facing error with an HTTP status and an Uzbek message.
type Error struct {
	Status int
	Code   string
	Msg    string
	// Data carries optional machine-readable details (e.g. which limit was hit).
	Data map[string]any
}

func (e *Error) Error() string { return e.Code + ": " + e.Msg }

func errf(status int, code, msg string) *Error { return &Error{Status: status, Code: code, Msg: msg} }

var (
	ErrUnauthorized = errf(401, "unauthorized", "Tizimga kirish talab qilinadi")
	ErrForbidden    = errf(403, "forbidden", "Bu amal uchun ruxsat yo'q")
	ErrNotFound     = errf(404, "not_found", "Topilmadi")
	ErrBadRequest   = errf(400, "bad_request", "Noto'g'ri so'rov")
)

// Actor identifies who performs an action (for audit and authorisation).
type Actor struct {
	Type string // admin | user | guest | system | anonymous
	ID   int64
	Name string
	IP   string
}

var System = Actor{Type: "system", Name: "system"}

// Enforcer re-evaluates live media sessions and disconnects the ones that are
// no longer authorised. Implemented by the media package.
type Enforcer interface {
	EnforceNow(ctx context.Context, why string)
	KickPublisher(ctx context.Context, streamID int64, reason string)
}

// EventSink delivers realtime notifications (SSE) to browsers.
type EventSink interface {
	ToAdmins(kind string, data any)
	ToSession(sessionID int64, kind string, data any)
	ToAll(kind string, data any)
	CloseSession(sessionID int64)
}

type nopEnforcer struct{}

func (nopEnforcer) EnforceNow(context.Context, string)            {}
func (nopEnforcer) KickPublisher(context.Context, int64, string) {}

type nopEvents struct{}

func (nopEvents) ToAdmins(string, any)          {}
func (nopEvents) ToSession(int64, string, any) {}
func (nopEvents) ToAll(string, any)            {}
func (nopEvents) CloseSession(int64)           {}

type Service struct {
	St        *store.Store
	Cfg       *config.Config
	MasterKey []byte
	Log       *slog.Logger

	Enforcer Enforcer
	Events   EventSink
	// PathBusy reports whether a MediaMTX path already has a publisher.
	PathBusy func(ctx context.Context, path string) (bool, error)

	Now func() time.Time

	touchMu   sync.Mutex
	lastTouch map[int64]int64
	auditMu   sync.Mutex
	auditRate map[string]int64
}

func New(st *store.Store, cfg *config.Config, masterKey []byte, log *slog.Logger) *Service {
	return &Service{
		St: st, Cfg: cfg, MasterKey: masterKey, Log: log,
		Enforcer: nopEnforcer{}, Events: nopEvents{},
		PathBusy:  func(context.Context, string) (bool, error) { return false, nil },
		Now:       time.Now,
		lastTouch: map[int64]int64{},
		auditRate: map[string]int64{},
	}
}

func (s *Service) nowMs() int64 { return s.Now().UnixMilli() }

// Audit writes an audit record. Details must never contain secrets; callers
// pass masked values only.
func (s *Service) Audit(ctx context.Context, a Actor, action, target string, details map[string]any) {
	s.auditExec(ctx, s.St.DB, a, action, target, details)
}

type execer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

func (s *Service) auditExec(ctx context.Context, db execer, a Actor, action, target string, details map[string]any) {
	d := ""
	if len(details) > 0 {
		b, _ := json.Marshal(details)
		d = string(b)
	}
	var id any
	if a.ID != 0 {
		id = a.ID
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO audit_log(ts,actor_type,actor_id,actor_name,action,target,details,ip) VALUES(?,?,?,?,?,?,?,?)`,
		s.nowMs(), a.Type, id, a.Name, action, target, d, a.IP); err != nil {
		s.Log.Error("audit write failed", "action", action, "err", err)
	}
}

// AuditRateLimited records at most one event per key per minute (used for
// floods of denied publish/read attempts).
func (s *Service) AuditRateLimited(ctx context.Context, key string, a Actor, action, target string, details map[string]any) {
	now := s.nowMs()
	s.auditMu.Lock()
	last := s.auditRate[key]
	if now-last < 60_000 {
		s.auditMu.Unlock()
		return
	}
	s.auditRate[key] = now
	if len(s.auditRate) > 10000 {
		s.auditRate = map[string]int64{}
	}
	s.auditMu.Unlock()
	s.Audit(ctx, a, action, target, details)
}

// ---- global settings ----

type SystemState struct {
	EmergencyStop bool   `json:"emergencyStop"`
	InstanceState string `json:"instanceState"`
	InstanceID    string `json:"instanceId"`
	GuestEnabled  bool   `json:"guestEnabled"`
	GuestMinutes  int    `json:"guestDefaultMinutes"`
}

func (s *Service) State(ctx context.Context) (SystemState, error) {
	rows, err := s.St.DB.QueryContext(ctx, `SELECT key,value FROM settings`)
	if err != nil {
		return SystemState{}, err
	}
	defer rows.Close()
	st := SystemState{InstanceState: "active", GuestEnabled: true, GuestMinutes: 120}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return st, err
		}
		switch k {
		case "emergency_stop":
			st.EmergencyStop = v == "1"
		case "instance_state":
			st.InstanceState = v
		case "instance_id":
			st.InstanceID = v
		case "guest_enabled":
			st.GuestEnabled = v == "1"
		case "guest_default_minutes":
			st.GuestMinutes = atoiDefault(v, 120)
		}
	}
	return st, rows.Err()
}

func (s *Service) SetEmergencyStop(ctx context.Context, a Actor, on bool) error {
	v := "0"
	if on {
		v = "1"
	}
	if err := s.St.SetSetting(ctx, "emergency_stop", v); err != nil {
		return err
	}
	s.Audit(ctx, a, map[bool]string{true: "emergency_stop_on", false: "emergency_stop_off"}[on], "", nil)
	s.Enforcer.EnforceNow(ctx, "emergency_stop")
	s.Events.ToAdmins("state", nil)
	return nil
}

func (s *Service) SetInstanceState(ctx context.Context, a Actor, state string) error {
	switch state {
	case "active", "standby", "migrated":
	default:
		return ErrBadRequest
	}
	if err := s.St.SetSetting(ctx, "instance_state", state); err != nil {
		return err
	}
	s.Audit(ctx, a, "instance_state", state, nil)
	s.Enforcer.EnforceNow(ctx, "instance_state")
	for _, st := range s.streamIDs(ctx) {
		if state != "active" {
			s.Enforcer.KickPublisher(ctx, st, "instance_"+state)
		}
	}
	return nil
}

func (s *Service) SetGuestSettings(ctx context.Context, a Actor, enabled bool, minutes int) error {
	if minutes < 5 || minutes > 60*24*30 {
		return errf(400, "bad_minutes", "Muddat 5 daqiqadan 30 kungacha bo'lishi kerak")
	}
	v := "0"
	if enabled {
		v = "1"
	}
	if err := s.St.SetSetting(ctx, "guest_enabled", v); err != nil {
		return err
	}
	if err := s.St.SetSetting(ctx, "guest_default_minutes", itoa(int64(minutes))); err != nil {
		return err
	}
	s.Audit(ctx, a, "settings_guest", "", map[string]any{"enabled": enabled, "minutes": minutes})
	return nil
}

// Cleanup applies retention: audit records, ended media sessions, tickets,
// expired sessions and finished guest requests.
func (s *Service) Cleanup(ctx context.Context) error {
	now := s.nowMs()
	days := int64(s.Cfg.Security.AuditRetainDays)
	if days < 1 {
		days = 1
	}
	cut := now - days*86400_000
	stmts := []struct {
		q    string
		args []any
	}{
		{`DELETE FROM audit_log WHERE ts < ?`, []any{cut}},
		{`DELETE FROM media_sessions WHERE status='ended' AND ended_at < ?`, []any{now - 30*86400_000}},
		{`DELETE FROM playback_tickets WHERE expires_at < ?`, []any{now - 86400_000}},
		{`DELETE FROM web_sessions WHERE (revoked_at IS NOT NULL OR expires_at < ?) AND last_seen_at < ? AND id NOT IN (SELECT web_session_id FROM media_sessions WHERE status!='ended')`, []any{now, now - 7*86400_000}},
		{`DELETE FROM grants WHERE (revoked_at IS NOT NULL AND revoked_at < ?) OR (expires_at IS NOT NULL AND expires_at < ?)`, []any{cut, cut}},
		{`DELETE FROM grants WHERE object_type='content' AND object_id NOT IN (SELECT id FROM contents)`, nil},
		{`DELETE FROM grants WHERE object_type='collection' AND object_id NOT IN (SELECT id FROM collections)`, nil},
		{`DELETE FROM link_activations WHERE created_at < ? AND created_at > 0`, []any{cut}},
		{`DELETE FROM guests WHERE status IN ('rejected','ended') AND COALESCE(decided_at, created_at) < ? AND id NOT IN (SELECT guest_id FROM web_sessions WHERE guest_id IS NOT NULL)`, []any{cut}},
	}
	for _, st := range stmts {
		if _, err := s.St.DB.ExecContext(ctx, st.q, st.args...); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) streamIDs(ctx context.Context) []int64 {
	rows, err := s.St.DB.QueryContext(ctx, `SELECT id FROM streams`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		rows.Scan(&id)
		ids = append(ids, id)
	}
	return ids
}

func isNoRows(err error) bool { return errors.Is(err, sql.ErrNoRows) }
