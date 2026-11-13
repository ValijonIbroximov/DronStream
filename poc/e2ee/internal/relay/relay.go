// Package relay is the keyless relay: an HTTP server that stores and
// forwards opaque bytes. It never receives, derives or stores a key, and it
// contains no cryptography (it does not even import this module's sframe or
// envelope packages).
//
//	POST /v1/streams/{id}/frames           publisher: stream of length-prefixed frames
//	GET  /v1/streams/{id}/frames           viewer: the same frames as a chunked response
//	POST /v1/streams/{id}/joins            viewer: {"pub": base64, "label": text}
//	GET  /v1/streams/{id}/joins            source: all join requests
//	POST /v1/streams/{id}/envelopes/{to}   source: opaque sealed envelope for recipient {to}
//	GET  /v1/streams/{id}/envelopes/{to}   viewer: envelopes addressed to {to}
//	GET  /healthz
//
// What the relay necessarily learns (metadata): who connects and when, frame
// sizes and timing, viewer public keys, which keys received envelopes.
//
// The Attack* methods simulate a malicious relay for tests and demos.
package relay

import (
	"bufio"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"regexp"
	"sync"

	"dronstream-poc-e2ee/internal/wire"
)

const (
	maxStreams       = 16
	maxJoins         = 64
	maxRecipients    = 256
	maxEnvelopesEach = 32
	maxJSONBody      = 4 << 10
	subscriberQueue  = 256 // frames buffered per viewer before frames are dropped for it
	historyFrames    = 64  // only kept when attack hooks are enabled
)

var (
	streamIDPattern  = regexp.MustCompile(`^[A-Za-z0-9_-]{1,64}$`)
	recipientPattern = regexp.MustCompile(`^[0-9a-f]{64}$`)
)

// Join is a viewer's request to be admitted: its public key and a free-text
// label. Both are untrusted input from the network.
type Join struct {
	Pub   string `json:"pub"`   // base64 of the 65-byte uncompressed P-256 public key
	Label string `json:"label"` // optional, display only
}

// Options configure a Relay.
type Options struct {
	// AllowedOrigins are the web origins (scheme://host:port) that may call
	// the relay from a browser. The viewer page is served from one of them.
	AllowedOrigins []string
	// AttackHooks enables the Attack* methods (malicious relay simulation).
	AttackHooks bool
}

// Relay implements http.Handler.
type Relay struct {
	opts    Options
	origins map[string]bool
	mux     *http.ServeMux

	mu      sync.Mutex
	streams map[string]*stream

	// Malicious-relay simulation state (unused unless opts.AttackHooks).
	tamper     int
	replay     int
	substitute string // base64 public key shown to the source instead of the real ones
}

type stream struct {
	subs       map[chan []byte]struct{}
	publishing bool
	joins      []Join
	envelopes  map[string][]json.RawMessage
	history    [][]byte
}

// New creates a relay.
func New(opts Options) *Relay {
	r := &Relay{opts: opts, origins: map[string]bool{}, streams: map[string]*stream{}, mux: http.NewServeMux()}
	for _, o := range opts.AllowedOrigins {
		r.origins[o] = true
	}
	r.mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { io.WriteString(w, "ok\n") })
	r.mux.HandleFunc("POST /v1/streams/{stream}/frames", r.publish)
	r.mux.HandleFunc("GET /v1/streams/{stream}/frames", r.subscribe)
	r.mux.HandleFunc("POST /v1/streams/{stream}/joins", r.postJoin)
	r.mux.HandleFunc("GET /v1/streams/{stream}/joins", r.getJoins)
	r.mux.HandleFunc("POST /v1/streams/{stream}/envelopes/{to}", r.postEnvelope)
	r.mux.HandleFunc("GET /v1/streams/{stream}/envelopes/{to}", r.getEnvelopes)
	return r
}

// ServeHTTP adds CORS for the allowed viewer origins and dispatches.
func (r *Relay) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	w.Header().Add("Vary", "Origin")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if origin := req.Header.Get("Origin"); origin != "" && r.origins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		if req.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set("Access-Control-Max-Age", "600")
			w.WriteHeader(http.StatusNoContent)
			return
		}
	}
	r.mux.ServeHTTP(w, req)
}

// stream returns the named stream, creating it on first use. Callers hold r.mu.
func (r *Relay) stream(id string) (*stream, error) {
	if !streamIDPattern.MatchString(id) {
		return nil, errors.New("bad stream id")
	}
	if s := r.streams[id]; s != nil {
		return s, nil
	}
	if len(r.streams) >= maxStreams {
		return nil, errors.New("too many streams")
	}
	s := &stream{subs: map[chan []byte]struct{}{}, envelopes: map[string][]json.RawMessage{}}
	r.streams[id] = s
	return s, nil
}

// with runs fn on the stream named in the request path while holding the lock.
func (r *Relay) with(w http.ResponseWriter, req *http.Request, fn func(s *stream) (status int, msg string)) bool {
	r.mu.Lock()
	s, err := r.stream(req.PathValue("stream"))
	status, msg := http.StatusBadRequest, ""
	if err != nil {
		msg = err.Error()
	} else {
		status, msg = fn(s)
	}
	r.mu.Unlock()
	if status >= 400 {
		http.Error(w, msg, status)
		return false
	}
	return true
}

// ---- frames -----------------------------------------------------------------

func (r *Relay) publish(w http.ResponseWriter, req *http.Request) {
	var st *stream
	if !r.with(w, req, func(s *stream) (int, string) {
		if s.publishing {
			return http.StatusConflict, "stream already has a publisher"
		}
		s.publishing, st = true, s
		return http.StatusOK, ""
	}) {
		return
	}
	defer func() {
		r.mu.Lock()
		st.publishing = false
		r.mu.Unlock()
	}()

	br := bufio.NewReaderSize(req.Body, 64<<10)
	for {
		frame, err := wire.ReadFrame(br)
		if err == io.EOF {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if err != nil {
			http.Error(w, "bad frame stream", http.StatusBadRequest)
			return
		}
		r.forward(st, frame)
	}
}

// forward hands one frame to every connected viewer. The frame is an opaque
// byte string to the relay.
func (r *Relay) forward(st *stream, frame []byte) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := frame
	if r.tamper > 0 { // attack simulation: flip one bit
		r.tamper--
		out = append([]byte{}, frame...)
		out[len(out)/2] ^= 0x01
	}
	st.deliver(out)
	if r.opts.AttackHooks {
		st.history = append(st.history, frame)
		if len(st.history) > historyFrames {
			st.history = st.history[1:]
		}
		if r.replay > 0 && len(st.history) > 1 { // attack simulation: resend an old frame
			r.replay--
			st.deliver(st.history[0])
		}
	}
}

func (st *stream) deliver(frame []byte) {
	for ch := range st.subs {
		select {
		case ch <- frame:
		default: // this viewer is too slow: drop the frame for it
		}
	}
}

func (r *Relay) subscribe(w http.ResponseWriter, req *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	ch := make(chan []byte, subscriberQueue)
	var st *stream
	if !r.with(w, req, func(s *stream) (int, string) {
		s.subs[ch] = struct{}{}
		st = s
		return http.StatusOK, ""
	}) {
		return
	}
	defer func() {
		r.mu.Lock()
		delete(st.subs, ch)
		r.mu.Unlock()
	}()

	w.Header().Set("Content-Type", "application/octet-stream")
	w.WriteHeader(http.StatusOK)
	flusher.Flush() // the viewer is subscribed once it sees the response headers
	for {
		select {
		case <-req.Context().Done():
			return
		case frame := <-ch:
			if wire.WriteFrame(w, frame) != nil {
				return
			}
			flusher.Flush()
		}
	}
}

// ---- join requests ----------------------------------------------------------

func readJSON(w http.ResponseWriter, req *http.Request, into any) ([]byte, bool) {
	body, err := io.ReadAll(http.MaxBytesReader(w, req.Body, maxJSONBody))
	if err != nil || json.Unmarshal(body, into) != nil {
		http.Error(w, "bad JSON body", http.StatusBadRequest)
		return nil, false
	}
	return body, true
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func (r *Relay) postJoin(w http.ResponseWriter, req *http.Request) {
	var j Join
	if _, ok := readJSON(w, req, &j); !ok {
		return
	}
	if pub, err := base64.StdEncoding.DecodeString(j.Pub); err != nil || len(pub) != 65 || len(j.Label) > 64 {
		http.Error(w, "bad join request", http.StatusBadRequest)
		return
	}
	if r.with(w, req, func(s *stream) (int, string) {
		for _, old := range s.joins {
			if old.Pub == j.Pub {
				return http.StatusOK, "" // already known
			}
		}
		if len(s.joins) >= maxJoins {
			return http.StatusTooManyRequests, "too many join requests"
		}
		s.joins = append(s.joins, j)
		return http.StatusOK, ""
	}) {
		w.WriteHeader(http.StatusNoContent)
	}
}

func (r *Relay) getJoins(w http.ResponseWriter, req *http.Request) {
	joins := []Join{}
	if r.with(w, req, func(s *stream) (int, string) {
		for _, j := range s.joins {
			if r.substitute != "" { // attack simulation: show the relay's own key
				j.Pub = r.substitute
			}
			joins = append(joins, j)
		}
		return http.StatusOK, ""
	}) {
		writeJSON(w, joins)
	}
}

// ---- sealed key envelopes ---------------------------------------------------

func (r *Relay) postEnvelope(w http.ResponseWriter, req *http.Request) {
	to := req.PathValue("to")
	var opaque json.RawMessage // only checked to be JSON; the relay does not interpret it
	body, ok := readJSON(w, req, &opaque)
	if !ok {
		return
	}
	if !recipientPattern.MatchString(to) {
		http.Error(w, "bad recipient id", http.StatusBadRequest)
		return
	}
	if r.with(w, req, func(s *stream) (int, string) {
		if _, known := s.envelopes[to]; !known && len(s.envelopes) >= maxRecipients {
			return http.StatusTooManyRequests, "too many recipients"
		}
		list := append(s.envelopes[to], json.RawMessage(body))
		if len(list) > maxEnvelopesEach {
			list = list[len(list)-maxEnvelopesEach:]
		}
		s.envelopes[to] = list
		return http.StatusOK, ""
	}) {
		w.WriteHeader(http.StatusNoContent)
	}
}

func (r *Relay) getEnvelopes(w http.ResponseWriter, req *http.Request) {
	to := req.PathValue("to")
	list := []json.RawMessage{}
	if r.with(w, req, func(s *stream) (int, string) {
		list = append(list, s.envelopes[to]...)
		return http.StatusOK, ""
	}) {
		writeJSON(w, list)
	}
}

// ---- malicious relay simulation --------------------------------------------

var errNoHooks = errors.New("relay: attack hooks are disabled")

// AttackTamper corrupts the next n forwarded frames (one bit each).
func (r *Relay) AttackTamper(n int) error {
	if !r.opts.AttackHooks {
		return errNoHooks
	}
	r.mu.Lock()
	r.tamper += n
	r.mu.Unlock()
	return nil
}

// AttackReplay makes the relay send an old, previously forwarded frame again
// right after each of the next n frames.
func (r *Relay) AttackReplay(n int) error {
	if !r.opts.AttackHooks {
		return errNoHooks
	}
	r.mu.Lock()
	r.replay += n
	r.mu.Unlock()
	return nil
}

// AttackSubstituteJoinKey makes every join request shown to the source carry
// pub (a key the relay controls) instead of the viewer's real key. A nil pub
// switches the substitution off.
func (r *Relay) AttackSubstituteJoinKey(pub []byte) error {
	if !r.opts.AttackHooks {
		return errNoHooks
	}
	r.mu.Lock()
	r.substitute = ""
	if pub != nil {
		r.substitute = base64.StdEncoding.EncodeToString(pub)
	}
	r.mu.Unlock()
	return nil
}
