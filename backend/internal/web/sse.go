package web

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"dronstream/internal/core"
)

type event struct {
	Kind string `json:"kind"`
	Data any    `json:"data,omitempty"`
}

type client struct {
	sessionID int64
	admin     bool
	ch        chan event
	done      chan struct{}
	once      sync.Once
}

// Hub fans out realtime events over Server-Sent Events and tracks which
// browser sessions currently have the site open ("online on site").
type Hub struct {
	mu      sync.Mutex
	clients map[*client]struct{}
}

func NewHub() *Hub { return &Hub{clients: map[*client]struct{}{}} }

func (h *Hub) send(filter func(*client) bool, kind string, data any) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.clients {
		if filter(c) {
			select {
			case c.ch <- event{kind, data}:
			default: // slow client: drop; the UI re-fetches on reconnect
			}
		}
	}
}

func (h *Hub) ToAdmins(kind string, data any) {
	h.send(func(c *client) bool { return c.admin }, kind, data)
}

func (h *Hub) ToSession(id int64, kind string, data any) {
	h.send(func(c *client) bool { return c.sessionID == id }, kind, data)
}

func (h *Hub) CloseSession(id int64) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.clients {
		if c.sessionID == id {
			c.once.Do(func() { close(c.done) })
		}
	}
}

// Online returns the set of session IDs with an open event stream.
func (h *Hub) Online() map[int64]int {
	h.mu.Lock()
	defer h.mu.Unlock()
	m := map[int64]int{}
	for c := range h.clients {
		m[c.sessionID]++
	}
	return m
}

func (h *Hub) serve(w http.ResponseWriter, r *http.Request, sess *core.Session, touch func()) {
	fl, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", 500)
		return
	}
	c := &client{sessionID: sess.ID, admin: sess.IsAdmin(), ch: make(chan event, 32), done: make(chan struct{})}
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
	if c.admin {
		h.ToAdmins("sessions", nil)
	}
	defer func() {
		h.mu.Lock()
		delete(h.clients, c)
		h.mu.Unlock()
		if !c.admin {
			h.ToAdmins("sessions", nil)
		}
	}()
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(200)
	fmt.Fprint(w, "retry: 3000\n\n")
	fl.Flush()
	h.ToAdmins("sessions", nil)
	hb := time.NewTicker(15 * time.Second)
	defer hb.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-c.done:
			b, _ := json.Marshal(event{Kind: "closed"})
			fmt.Fprintf(w, "data: %s\n\n", b)
			fl.Flush()
			return
		case e := <-c.ch:
			b, _ := json.Marshal(e)
			if _, err := fmt.Fprintf(w, "data: %s\n\n", b); err != nil {
				return
			}
			fl.Flush()
		case <-hb.C:
			touch()
			if _, err := fmt.Fprint(w, ": hb\n\n"); err != nil {
				return
			}
			fl.Flush()
		}
	}
}
