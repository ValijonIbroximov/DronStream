// Package mtx manages the MediaMTX child process and talks to its Control API
// (v3, MediaMTX v1.21.3 — see api/openapi.yaml at that tag).
package mtx

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// PinnedVersion is the MediaMTX release this code was written and tested against.
const PinnedVersion = "v1.21.3"

type WebRTCSession struct {
	ID                        string  `json:"id"`
	Created                   string  `json:"created"`
	RemoteAddr                string  `json:"remoteAddr"`
	PeerConnectionEstablished bool    `json:"peerConnectionEstablished"`
	LocalCandidate            string  `json:"localCandidate"`
	RemoteCandidate           string  `json:"remoteCandidate"`
	State                     string  `json:"state"`
	Path                      string  `json:"path"`
	Query                     string  `json:"query"`
	ExpiresAt                 *string `json:"expiresAt"`
	OutboundBytes             int64   `json:"outboundBytes"`
	InboundBytes              int64   `json:"inboundBytes"`
	OutboundRTPPackets        int64   `json:"outboundRTPPackets"`
	OutboundFramesDiscarded   int64   `json:"outboundFramesDiscarded"`
}

type PathSource struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

type PathTrack struct {
	Codec      string         `json:"codec"`
	CodecProps map[string]any `json:"codecProps"`
}

type Path struct {
	Name          string       `json:"name"`
	Online        bool         `json:"online"`
	OnlineTime    *string      `json:"onlineTime"`
	Available     bool         `json:"available"`
	Source        *PathSource  `json:"source"`
	Tracks2       []PathTrack  `json:"tracks2"`
	Tracks        []string     `json:"tracks"`
	InboundBytes  int64        `json:"inboundBytes"`
	OutboundBytes int64        `json:"outboundBytes"`
	InboundFramesInError int64 `json:"inboundFramesInError"`
	Readers       []PathSource `json:"readers"`
}

type RTMPConn struct {
	ID            string `json:"id"`
	Created       string `json:"created"`
	RemoteAddr    string `json:"remoteAddr"`
	State         string `json:"state"`
	Path          string `json:"path"`
	InboundBytes  int64  `json:"inboundBytes"`
	OutboundBytes int64  `json:"outboundBytes"`
}

// API is the subset of the Control API that DronStream uses. An interface so
// tests can substitute a fake.
type API interface {
	WebRTCSessions(ctx context.Context) ([]WebRTCSession, error)
	KickWebRTC(ctx context.Context, id string) error
	Paths(ctx context.Context) ([]Path, error)
	GetPath(ctx context.Context, name string) (*Path, error)
	RTMPConns(ctx context.Context, secure bool) ([]RTMPConn, error)
	KickRTMP(ctx context.Context, id string, secure bool) error
	KickWebRTCPublisher(ctx context.Context, id string) error
}

type Client struct {
	Base string // http://127.0.0.1:9997
	HTTP *http.Client
}

func NewClient(addr string) *Client {
	return &Client{Base: "http://" + addr, HTTP: &http.Client{Timeout: 3 * time.Second}}
}

var ErrNotFound = fmt.Errorf("mtx: not found")

func (c *Client) do(ctx context.Context, method, p string, out any) error {
	req, err := http.NewRequestWithContext(ctx, method, c.Base+p, nil)
	if err != nil {
		return err
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode == 404 {
		io.Copy(io.Discard, resp.Body)
		return ErrNotFound
	}
	if resp.StatusCode/100 != 2 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("mtx %s %s: %d %s", method, p, resp.StatusCode, b)
	}
	if out == nil {
		io.Copy(io.Discard, resp.Body)
		return nil
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

type list[T any] struct {
	PageCount int `json:"pageCount"`
	Items     []T `json:"items"`
}

func listAll[T any](ctx context.Context, c *Client, p string) ([]T, error) {
	var all []T
	for page := 0; page < 100; page++ {
		var l list[T]
		if err := c.do(ctx, "GET", fmt.Sprintf("%s?itemsPerPage=1000&page=%d", p, page), &l); err != nil {
			return nil, err
		}
		all = append(all, l.Items...)
		if page+1 >= l.PageCount {
			break
		}
	}
	return all, nil
}

func (c *Client) WebRTCSessions(ctx context.Context) ([]WebRTCSession, error) {
	return listAll[WebRTCSession](ctx, c, "/v3/webrtc/sessions/list")
}

func (c *Client) KickWebRTC(ctx context.Context, id string) error {
	return c.do(ctx, "POST", "/v3/webrtc/sessions/kick/"+url.PathEscape(id), nil)
}

func (c *Client) KickWebRTCPublisher(ctx context.Context, id string) error { return c.KickWebRTC(ctx, id) }

func (c *Client) Paths(ctx context.Context) ([]Path, error) {
	return listAll[Path](ctx, c, "/v3/paths/list")
}

func (c *Client) GetPath(ctx context.Context, name string) (*Path, error) {
	var p Path
	// path names contain '/', which MediaMTX expects unescaped in the URL.
	if err := c.do(ctx, "GET", "/v3/paths/get/"+name, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (c *Client) RTMPConns(ctx context.Context, secure bool) ([]RTMPConn, error) {
	kind := "rtmp"
	if secure {
		kind = "rtmps"
	}
	return listAll[RTMPConn](ctx, c, "/v3/"+kind+"/conns/list")
}

func (c *Client) KickRTMP(ctx context.Context, id string, secure bool) error {
	kind := "rtmp"
	if secure {
		kind = "rtmps"
	}
	return c.do(ctx, "POST", "/v3/"+kind+"/conns/kick/"+url.PathEscape(id), nil)
}
