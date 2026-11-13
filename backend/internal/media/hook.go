package media

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"dronstream/internal/core"
	"dronstream/internal/secure"
)

// HookHandler serves POST /internal/mtx-auth/<secret> for MediaMTX's
// authMethod=http. It listens on loopback only; the secret path component is
// defence in depth against other local processes.
func (m *Manager) HookHandler(secret string) http.Handler {
	want := []byte(secret)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got := strings.TrimPrefix(r.URL.Path, "/internal/mtx-auth/")
		if r.Method != http.MethodPost || !secure.Equal([]byte(got), want) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		var req core.HookRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, 64<<10)).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		if !m.Healthy() {
			// Fail closed: auth subsystem unavailable => deny everything.
			http.Error(w, "auth unavailable", http.StatusUnauthorized)
			return
		}
		ctx := r.Context()
		switch req.Action {
		case "publish":
			if err := m.Core.HookPublish(ctx, req); err != nil {
				m.Log.Info("publish denied", "path", req.Path, "ip", req.IP, "err", errCode(err))
				http.Error(w, "denied", http.StatusUnauthorized)
				return
			}
			w.WriteHeader(http.StatusOK)
		case "read":
			lease, err := m.Core.HookRead(ctx, req)
			if err != nil {
				m.Log.Info("read denied", "ip", req.IP, "protocol", req.Protocol, "err", errCode(err))
				http.Error(w, "denied", http.StatusUnauthorized)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"expireAt": time.UnixMilli(lease).UTC().Format(time.RFC3339Nano)})
		default:
			// playback, metrics, pprof (disabled anyway) and anything unknown.
			http.Error(w, "denied", http.StatusUnauthorized)
		}
	})
}

func errCode(err error) string {
	var ce *core.Error
	if errors.As(err, &ce) {
		return ce.Code
	}
	return err.Error()
}
