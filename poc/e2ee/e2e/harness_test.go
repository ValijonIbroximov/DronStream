// Package e2e holds the end-to-end tests of the chain
// source -> keyless relay -> viewer. There is no production code here.
package e2e

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"dronstream-poc-e2ee/internal/h264"
	"dronstream-poc-e2ee/internal/relay"
	"dronstream-poc-e2ee/internal/source"
	"dronstream-poc-e2ee/internal/viewer"
	"dronstream-poc-e2ee/sframe"
)

const (
	testStream = "test-stream"
	testSuite  = sframe.AES256GCMSHA512128
)

// wireLog records every byte that enters or leaves the relay over HTTP:
// request lines, headers, request bodies and response bodies.
type wireLog struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (l *wireLog) Write(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.buf.Write(p)
}

func (l *wireLog) Snapshot() []byte {
	l.mu.Lock()
	defer l.mu.Unlock()
	return bytes.Clone(l.buf.Bytes())
}

type teeBody struct {
	io.Reader
	io.Closer
}

type teeWriter struct {
	http.ResponseWriter
	log *wireLog
}

func (w *teeWriter) Write(p []byte) (int, error) {
	w.log.Write(p)
	return w.ResponseWriter.Write(p)
}

func (w *teeWriter) Flush() { w.ResponseWriter.(http.Flusher).Flush() }

// recording wraps the relay so that the test sees exactly what the relay sees.
func recording(next http.Handler, l *wireLog) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(l, "\n%s %s\n", r.Method, r.URL.RequestURI())
		for name, values := range r.Header {
			fmt.Fprintf(l, "%s: %s\n", name, strings.Join(values, ","))
		}
		r.Body = teeBody{io.TeeReader(r.Body, l), r.Body}
		next.ServeHTTP(&teeWriter{w, l}, r)
	})
}

// chain is one source, one in-process relay and any number of Go viewers.
type chain struct {
	t     *testing.T
	ctx   context.Context
	relay *relay.Relay
	url   string
	log   *wireLog
	src   *source.Source
	pub   *source.Publisher
	units [][]byte
	sent  int
}

func newChain(t *testing.T) *chain {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	t.Cleanup(cancel)
	c := &chain{t: t, ctx: ctx, log: &wireLog{}, units: h264.Synthetic(120, 15)}
	c.relay = relay.New(relay.Options{AttackHooks: true})
	srv := httptest.NewServer(recording(c.relay, c.log))
	t.Cleanup(func() {
		srv.CloseClientConnections()
		srv.Close()
	})
	c.url = srv.URL

	var err error
	if c.src, err = source.New(c.url, testStream, testSuite); err != nil {
		t.Fatal(err)
	}
	if c.pub, err = c.src.OpenPublisher(ctx); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { c.pub.Close() })
	return c
}

// join creates a viewer with a fresh key pair, posts its join request and
// subscribes it to the frame stream. It is not approved yet.
func (c *chain) join(label string) *viewer.Client {
	c.t.Helper()
	v, err := viewer.NewClient(c.url, testStream)
	if err != nil {
		c.t.Fatal(err)
	}
	if err := v.Join(c.ctx, label); err != nil {
		c.t.Fatal(err)
	}
	if err := v.Subscribe(c.ctx); err != nil {
		c.t.Fatal(err)
	}
	c.t.Cleanup(v.Close)
	return v
}

// approve is the operator approving the fingerprint the viewer reports.
func (c *chain) approve(v *viewer.Client) {
	c.t.Helper()
	if err := c.src.Approve(c.ctx, v.Fingerprint); err != nil {
		c.t.Fatalf("approve: %v", err)
	}
}

// send publishes the next access unit and returns its plaintext.
func (c *chain) send() []byte {
	c.t.Helper()
	au := c.units[c.sent%len(c.units)]
	c.sent++
	if _, _, err := c.pub.Send(au); err != nil {
		c.t.Fatalf("send: %v", err)
	}
	return au
}

// expect reads the next frame at viewer v and checks what happened to it.
// For a decrypted frame the plaintext must equal want byte for byte.
func (c *chain) expect(v *viewer.Client, want viewer.Result, wantPlaintext []byte) {
	c.t.Helper()
	plaintext, res, err := v.Next(c.ctx)
	if err != nil {
		c.t.Fatalf("viewer read: %v", err)
	}
	if res != want {
		c.t.Fatalf("frame result %v, want %v", res, want)
	}
	if want == viewer.Decrypted && !bytes.Equal(plaintext, wantPlaintext) {
		c.t.Fatalf("decrypted plaintext differs from what the source sent")
	}
	if want != viewer.Decrypted && plaintext != nil {
		c.t.Fatalf("a rejected frame must not yield plaintext")
	}
}
