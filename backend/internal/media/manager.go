// Package media enforces authorisation on live MediaMTX sessions: the hook
// endpoint, the reconciler/kicker, the DB watchdog and the WHEP proxy.
package media

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"dronstream/internal/core"
	"dronstream/internal/mtx"
)

type StreamStats struct {
	Online       bool    `json:"online"`
	OnlineSince  string  `json:"onlineSince,omitempty"`
	SourceType   string  `json:"sourceType,omitempty"`
	SourceAddr   string  `json:"sourceAddr,omitempty"`
	Codecs       []string `json:"codecs,omitempty"`
	Width        int     `json:"width,omitempty"`
	Height       int     `json:"height,omitempty"`
	InboundKbps  float64 `json:"inboundKbps"`
	OutboundKbps float64 `json:"outboundKbps"`
	Readers      int     `json:"readers"`
	FramesInError int64  `json:"framesInError"`
	InboundBytes int64   `json:"inboundBytes"`
	MeasuredAt   int64   `json:"measuredAt"`
}

type Manager struct {
	Core       *core.Service
	API        mtx.API
	Log        *slog.Logger
	WebRTCBase string // http://127.0.0.1:8889
	Interval   time.Duration

	passMu   sync.Mutex
	healthy  atomic.Bool
	mtxUp    atomic.Bool
	dbFails  int
	lastPass atomic.Int64

	statsMu sync.RWMutex
	stats   map[string]StreamStats // by MediaMTX path
	prev    map[string][3]int64    // path -> inbound, outbound, ts(ms)
	transfersMu sync.Mutex
	transfers   map[*Transfer]struct{}

	// Kick latency measurements (for TEST_REPORT / admin diagnostics).
	LastEnforce atomic.Int64 // duration of the last EnforceNow in µs
}

func NewManager(c *core.Service, api mtx.API, webrtcBase string, interval time.Duration, log *slog.Logger) *Manager {
	m := &Manager{Core: c, API: api, Log: log, WebRTCBase: webrtcBase, Interval: interval,
		stats: map[string]StreamStats{}, prev: map[string][3]int64{}, transfers: map[*Transfer]struct{}{}}
	m.healthy.Store(true)
	c.Enforcer = m
	c.PathBusy = m.PathBusy
	return m
}

// Healthy reports whether the authorisation subsystem (DB) is usable.
func (m *Manager) Healthy() bool { return m.healthy.Load() }
func (m *Manager) MediaUp() bool { return m.mtxUp.Load() }

// Run starts the reconciler and the DB watchdog until ctx is done.
func (m *Manager) Run(ctx context.Context) {
	t := time.NewTicker(m.Interval)
	defer t.Stop()
	cleanup := time.NewTicker(time.Hour)
	defer cleanup.Stop()
	m.Core.Cleanup(ctx)
	go func() { // watchdog runs independently of the reconciler
		wt := time.NewTicker(time.Second)
		defer wt.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-wt.C:
				m.watchdog(ctx)
			}
		}
	}()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			m.pass(ctx, "tick")
		case <-cleanup.C:
			if err := m.Core.Cleanup(ctx); err != nil {
				m.Log.Error("retention cleanup failed", "err", err)
			}
		}
	}
}

// watchdog: if the database fails 3 times in a row, the auth subsystem is
// declared unhealthy: new tickets/hooks are refused and ALL readers are kicked
// on every tick until it recovers (fail-closed).
func (m *Manager) watchdog(ctx context.Context) {
	c, cancel := context.WithTimeout(ctx, 2*time.Second)
	err := m.Core.St.Ping(c)
	cancel()
	if err == nil {
		if !m.healthy.Load() {
			m.Log.Warn("auth database recovered")
		}
		m.dbFails = 0
		m.healthy.Store(true)
		return
	}
	m.dbFails++
	m.Log.Error("auth database check failed", "err", err, "count", m.dbFails)
	if m.dbFails >= 3 {
		if m.healthy.Load() {
			m.Log.Error("auth subsystem UNHEALTHY: refusing new viewers and disconnecting existing ones")
		}
		m.healthy.Store(false)
		m.kickAllReaders(ctx, "auth_unavailable")
	}
}

func (m *Manager) kickAllReaders(ctx context.Context, why string) {
	ss, err := m.API.WebRTCSessions(ctx)
	if err != nil {
		return
	}
	var wg sync.WaitGroup
	for _, s := range ss {
		if s.State == "publish" {
			continue
		}
		wg.Add(1)
		go func(id string) { defer wg.Done(); m.API.KickWebRTC(ctx, id) }(s.ID)
	}
	wg.Wait()
}

// EnforceNow runs a reconcile pass synchronously; called right after a DB
// commit that may have reduced someone's access.
func (m *Manager) EnforceNow(ctx context.Context, why string) {
	start := time.Now()
	// Use a detached context so a cancelled HTTP request cannot abort kicks.
	c, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	if m.healthy.Load() {
		m.enforceTransfers(c) // independent of MediaMTX availability
	}
	m.pass(c, why)
	m.LastEnforce.Store(time.Since(start).Microseconds())
}

func parseTime(s string) time.Time {
	t, err := time.Parse(time.RFC3339Nano, s)
	if err != nil {
		return time.Time{}
	}
	return t
}

func (m *Manager) pass(ctx context.Context, why string) {
	m.passMu.Lock()
	defer m.passMu.Unlock()
	now := time.Now()
	sessions, err := m.API.WebRTCSessions(ctx)
	if err != nil {
		if m.mtxUp.Load() {
			m.Log.Error("mediamtx API unreachable", "err", err)
		}
		m.mtxUp.Store(false)
		return
	}
	m.mtxUp.Store(true)
	if !m.healthy.Load() {
		m.kickAllReaders(ctx, "auth_unavailable")
		m.cancelAllTransfers("auth_unavailable")
		return
	}
	sys, err := m.Core.State(ctx)
	if err != nil {
		return
	}
	live, err := m.Core.LiveMediaSessions(ctx)
	if err != nil {
		return
	}
	byMtx := make(map[string]*core.MediaSession, len(live))
	for _, ms := range live {
		byMtx[ms.MtxID] = ms
	}
	seen := map[string]bool{}
	type kick struct {
		id     string
		ms     *core.MediaSession
		reason string
	}
	var kicks []kick
	for _, s := range sessions {
		if s.State == "publish" {
			continue
		}
		seen[s.ID] = true
		ms := byMtx[s.ID]
		if ms == nil {
			created := parseTime(s.Created)
			if !created.IsZero() && now.Sub(created) > 5*time.Second {
				kicks = append(kicks, kick{id: s.ID, reason: "unknown_session"})
			}
			continue
		}
		d := m.Core.AuthorizeView(ctx, ms.WebSessionID, ms.StreamID, sys)
		if !d.OK {
			kicks = append(kicks, kick{id: s.ID, ms: ms, reason: d.Reason})
			continue
		}
		m.Core.UpdateMediaStats(ctx, ms.ID, s.PeerConnectionEstablished, s.OutboundBytes, candidateAddr(s.RemoteCandidate, s.RemoteAddr))
	}
	if len(kicks) > 0 {
		var wg sync.WaitGroup
		for _, k := range kicks {
			wg.Add(1)
			go func(k kick) {
				defer wg.Done()
				err := m.API.KickWebRTC(ctx, k.id)
				if err != nil && !errors.Is(err, mtx.ErrNotFound) {
					m.Log.Error("kick failed (will retry next pass)", "mtx", k.id[:8], "err", err)
					return
				}
				if k.ms != nil {
					m.Core.EndMedia(ctx, k.ms, k.reason)
				} else {
					m.Log.Warn("kicked unknown WebRTC session", "mtx", k.id[:8])
				}
			}(k)
		}
		wg.Wait()
		m.Log.Info("enforced", "why", why, "kicked", len(kicks), "took", time.Since(now))
	}
	for _, ms := range live {
		if seen[ms.MtxID] {
			continue
		}
		age := now.UnixMilli() - ms.CreatedAt
		if ms.Status == "pending" && age < 10_000 {
			continue
		}
		reason := "disconnected"
		if ms.LeaseUntil <= now.UnixMilli()+1500 {
			reason = "lease_expired"
		}
		m.Core.EndMedia(ctx, ms, reason)
	}
	m.lastPass.Store(now.UnixMilli())
	m.enforceTransfers(ctx)
	m.refreshPaths(ctx, sys)
}

func candidateAddr(cand, fallback string) string {
	// "host/udp/1.2.3.4/5000" -> "1.2.3.4:5000 (host/udp)"
	p := strings.Split(cand, "/")
	if len(p) == 4 {
		return p[2] + ":" + p[3] + " (" + p[0] + "/" + p[1] + ")"
	}
	return fallback
}

// refreshPaths updates stream statistics and disconnects publishers that are
// no longer allowed (publish blocked, key revoked, server not active).
func (m *Manager) refreshPaths(ctx context.Context, sys core.SystemState) {
	paths, err := m.API.Paths(ctx)
	if err != nil {
		return
	}
	conns, _ := m.API.RTMPConns(ctx, false)
	sconns, _ := m.API.RTMPConns(ctx, true)
	addr := map[string]string{}
	for _, c := range append(conns, sconns...) {
		addr[c.ID] = c.RemoteAddr
	}
	nowMs := time.Now().UnixMilli()
	stats := map[string]StreamStats{}
	m.statsMu.Lock()
	for _, p := range paths {
		st := StreamStats{Online: p.Online || p.Available, Readers: len(p.Readers), FramesInError: p.InboundFramesInError, InboundBytes: p.InboundBytes, MeasuredAt: nowMs}
		if p.OnlineTime != nil {
			st.OnlineSince = *p.OnlineTime
		}
		if p.Source != nil {
			st.SourceType = p.Source.Type
			st.SourceAddr = addr[p.Source.ID]
		}
		for _, t := range p.Tracks2 {
			st.Codecs = append(st.Codecs, t.Codec)
			if w, ok := t.CodecProps["width"].(float64); ok {
				st.Width = int(w)
			}
			if h, ok := t.CodecProps["height"].(float64); ok {
				st.Height = int(h)
			}
		}
		if prev, ok := m.prev[p.Name]; ok && nowMs > prev[2] && p.InboundBytes >= prev[0] {
			dt := float64(nowMs-prev[2]) / 1000
			st.InboundKbps = float64(p.InboundBytes-prev[0]) * 8 / 1000 / dt
			st.OutboundKbps = float64(p.OutboundBytes-prev[1]) * 8 / 1000 / dt
		}
		m.prev[p.Name] = [3]int64{p.InboundBytes, p.OutboundBytes, nowMs}
		stats[p.Name] = st
	}
	m.stats = stats
	m.statsMu.Unlock()

	for _, p := range paths {
		if p.Source == nil {
			continue
		}
		slug, key, ok := core.ParseMediaPath(p.Name)
		if !ok {
			m.kickSource(ctx, p.Source, "bad_path")
			continue
		}
		st, err := m.Core.StreamBySlug(ctx, slug)
		reason := ""
		switch {
		case err != nil:
			reason = "stream_deleted"
		case sys.InstanceState != "active":
			reason = "instance_" + sys.InstanceState
		case !st.PublishEnabled:
			reason = "publish_blocked"
		case !st.HasKey:
			reason = "key_revoked"
		case st.PublishMode == "path" && key == "":
			reason = "wrong_url_form"
		case st.PublishMode == "query" && key != "":
			reason = "wrong_url_form"
		case st.PublishMode == "path":
			if cur, _ := m.Core.MediaPath(st); cur != p.Name {
				reason = "key_rotated"
			}
		}
		if reason != "" {
			m.kickSource(ctx, p.Source, reason)
			m.Core.Audit(ctx, core.System, "publish_kicked", "stream:"+slug, map[string]any{"reason": reason})
		}
	}
}

func (m *Manager) kickSource(ctx context.Context, src *mtx.PathSource, reason string) {
	var err error
	switch src.Type {
	case "rtmpConn":
		err = m.API.KickRTMP(ctx, src.ID, false)
	case "rtmpsConn":
		err = m.API.KickRTMP(ctx, src.ID, true)
	case "webRTCSession":
		err = m.API.KickWebRTCPublisher(ctx, src.ID)
	default:
		m.Log.Warn("cannot kick source type", "type", src.Type)
		return
	}
	if err != nil && !errors.Is(err, mtx.ErrNotFound) {
		m.Log.Error("kick publisher failed", "err", err)
	} else {
		m.Log.Info("publisher disconnected", "reason", reason, "type", src.Type)
	}
}

// KickPublisher disconnects the current publisher of a stream (any of its paths).
func (m *Manager) KickPublisher(ctx context.Context, streamID int64, reason string) {
	c, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	st, err := m.Core.GetStream(c, streamID)
	if err != nil {
		return
	}
	paths, err := m.API.Paths(c)
	if err != nil {
		return
	}
	prefix := "live/" + st.Slug
	for _, p := range paths {
		if (p.Name == prefix || strings.HasPrefix(p.Name, prefix+"/")) && p.Source != nil {
			m.kickSource(c, p.Source, reason)
			m.Core.Audit(c, core.System, "publish_kicked", "stream:"+st.Slug, map[string]any{"reason": reason})
		}
	}
}

// PathBusy implements the "first publisher keeps the path" policy for audit
// and a clear admin alert. It must NOT call the MediaMTX API: the hook runs
// while MediaMTX waits for it, and a synchronous path query deadlocks until
// timeout (observed with v1.21.3). It uses the reconciler's snapshot (≤1 s
// old); the hard guarantee is MediaMTX's own overridePublisher=false.
func (m *Manager) PathBusy(ctx context.Context, path string) (bool, error) {
	m.statsMu.RLock()
	defer m.statsMu.RUnlock()
	return m.stats[path].SourceType != "", nil
}

// Stats returns the latest stats for a MediaMTX path.
func (m *Manager) Stats(path string) StreamStats {
	m.statsMu.RLock()
	defer m.statsMu.RUnlock()
	return m.stats[path]
}

func (m *Manager) LastPass() int64 { return m.lastPass.Load() }

// KickMedia disconnects one specific media session (admin action).
func (m *Manager) KickMedia(ctx context.Context, a core.Actor, id int64) error {
	ms, err := m.Core.MediaByID(ctx, id)
	if err != nil {
		return err
	}
	if err := m.API.KickWebRTC(ctx, ms.MtxID); err != nil && !errors.Is(err, mtx.ErrNotFound) {
		return err
	}
	m.Core.EndMedia(ctx, ms, "kicked_by_admin")
	m.Core.Audit(ctx, a, "media_kick", "stream:"+ms.StreamName, map[string]any{"subject": ms.SubjectType + ":" + ms.SubjectName})
	return nil
}

// Transfer is an in-flight delivery of an uploaded file (image/video bytes,
// including HTTP Range requests). Revocation cancels its context, which
// aborts the response mid-body; the next Range request is refused anyway.
type Transfer struct {
	WebSessionID int64
	ContentID    int64
	Cancel       func()
	Reason       string
}

func (m *Manager) TrackTransfer(t *Transfer) func() {
	m.transfersMu.Lock()
	m.transfers[t] = struct{}{}
	m.transfersMu.Unlock()
	return func() {
		m.transfersMu.Lock()
		delete(m.transfers, t)
		m.transfersMu.Unlock()
	}
}

func (m *Manager) ActiveTransfers() int {
	m.transfersMu.Lock()
	defer m.transfersMu.Unlock()
	return len(m.transfers)
}

func (m *Manager) snapshotTransfers() []*Transfer {
	m.transfersMu.Lock()
	defer m.transfersMu.Unlock()
	out := make([]*Transfer, 0, len(m.transfers))
	for t := range m.transfers {
		out = append(out, t)
	}
	return out
}

func (m *Manager) enforceTransfers(ctx context.Context) {
	for _, t := range m.snapshotTransfers() {
		if d := m.Core.AuthorizeContent(ctx, t.WebSessionID, t.ContentID); !d.OK {
			t.Reason = d.Reason
			t.Cancel()
			m.Core.Events.ToSession(t.WebSessionID, "content_revoked", map[string]any{"contentId": t.ContentID, "reason": d.Reason, "message": core.ReasonText(d.Reason)})
			m.Log.Info("file transfer cut", "content", t.ContentID, "reason", d.Reason)
		}
	}
}

func (m *Manager) cancelAllTransfers(reason string) {
	for _, t := range m.snapshotTransfers() {
		t.Reason = reason
		t.Cancel()
	}
}
