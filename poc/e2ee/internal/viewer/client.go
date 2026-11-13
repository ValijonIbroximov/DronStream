package viewer

import (
	"bufio"
	"bytes"
	"context"
	"crypto/hpke"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"dronstream-poc-e2ee/internal/envelope"
	"dronstream-poc-e2ee/internal/wire"
	"dronstream-poc-e2ee/sframe"
)

// Client is a headless viewer talking to the relay over HTTP.
type Client struct {
	relay  string
	stream string
	priv   hpke.PrivateKey
	api    *http.Client

	// Fingerprint identifies this viewer's public key to the operator.
	Fingerprint envelope.Fingerprint
	// Receiver holds keys, replay state and counters.
	Receiver *Receiver
	// LastFrame is the raw ciphertext most recently returned by Next.
	LastFrame []byte
	// MinFetchInterval limits how often Next asks the relay again for the key
	// of the same missing epoch.
	MinFetchInterval time.Duration

	askedEpoch uint64 // epoch we last asked the relay about because a frame needed it
	askedAt    time.Time
	body       io.ReadCloser
	frames     *bufio.Reader
}

// NewClient generates a fresh P-256 key pair for this viewer.
func NewClient(relayURL, stream string) (*Client, error) {
	priv, err := envelope.GenerateKey()
	if err != nil {
		return nil, err
	}
	return NewClientWithKey(relayURL, stream, priv)
}

// NewClientWithKey creates a viewer around an existing private key.
func NewClientWithKey(relayURL, stream string, priv hpke.PrivateKey) (*Client, error) {
	fp, err := envelope.FingerprintOf(priv.PublicKey().Bytes())
	if err != nil {
		return nil, err
	}
	return &Client{
		relay:       strings.TrimRight(relayURL, "/"),
		stream:      stream,
		priv:        priv,
		api:         &http.Client{Timeout: 5 * time.Second},
		Fingerprint: fp,
		Receiver:    NewReceiver(stream),
	}, nil
}

// PublicKey returns the 65-byte uncompressed public key.
func (c *Client) PublicKey() []byte { return c.priv.PublicKey().Bytes() }

func (c *Client) url(parts ...string) string {
	return c.relay + "/v1/streams/" + c.stream + "/" + strings.Join(parts, "/")
}

// Join posts this viewer's public key as a join request.
func (c *Client) Join(ctx context.Context, label string) error {
	body, _ := json.Marshal(map[string]string{
		"pub":   base64.StdEncoding.EncodeToString(c.PublicKey()),
		"label": label,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.url("joins"), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.api.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("relay refused the join request: %s", resp.Status)
	}
	return nil
}

// OpenedKey is a base key recovered from an envelope.
type OpenedKey struct {
	Epoch   uint64
	Suite   sframe.CipherSuite
	BaseKey []byte
}

// Envelopes downloads the envelopes addressed to this viewer and opens them
// with its private key. Envelopes that do not open are skipped and counted.
func (c *Client) Envelopes(ctx context.Context) (keys []OpenedKey, rejected int, err error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.url("envelopes", c.Fingerprint.Hex()), nil)
	if err != nil {
		return nil, 0, err
	}
	resp, err := c.api.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, 0, fmt.Errorf("relay answered %s", resp.Status)
	}
	var list []envelope.Envelope
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&list); err != nil {
		return nil, 0, err
	}
	for _, env := range list {
		baseKey, err := envelope.Open(c.priv, c.stream, env)
		if err != nil {
			rejected++
			continue
		}
		keys = append(keys, OpenedKey{Epoch: env.Epoch, Suite: sframe.CipherSuite(env.Suite), BaseKey: baseKey})
	}
	return keys, rejected, nil
}

// FetchKeys installs every key the relay currently holds for this viewer.
func (c *Client) FetchKeys(ctx context.Context) error {
	keys, _, err := c.Envelopes(ctx)
	if err != nil {
		return err
	}
	for _, k := range keys {
		if err := c.Receiver.AddKey(k.Epoch, k.Suite, k.BaseKey); err != nil {
			return err
		}
	}
	return nil
}

// Subscribe opens the frame stream. When it returns, the relay has
// registered this viewer: frames forwarded from now on will be received.
func (c *Client) Subscribe(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.url("frames"), nil)
	if err != nil {
		return err
	}
	resp, err := (&http.Client{}).Do(req) // long-lived: no overall timeout
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		return fmt.Errorf("relay answered %s", resp.Status)
	}
	c.body, c.frames = resp.Body, bufio.NewReaderSize(resp.Body, 64<<10)
	return nil
}

// Next reads one frame from the stream and processes it. If the frame names
// an epoch this viewer has no key for yet, it first asks the relay for new
// envelopes (RFC 9605, Section 4.4.4 allows retrying once a key arrives).
func (c *Client) Next(ctx context.Context) (plaintext []byte, res Result, err error) {
	if c.frames == nil {
		return nil, 0, errors.New("viewer: not subscribed")
	}
	frame, err := wire.ReadFrame(c.frames)
	if err != nil {
		return nil, 0, err
	}
	c.LastFrame = frame
	if kid, _, _, herr := sframe.DecodeHeader(frame); herr == nil && kid > c.Receiver.Stats.Epoch && !c.Receiver.HasKey(kid) {
		// Asked at once the first time an epoch shows up, then rate limited.
		if kid != c.askedEpoch || time.Since(c.askedAt) >= c.MinFetchInterval {
			c.askedEpoch, c.askedAt = kid, time.Now()
			c.FetchKeys(ctx) // best effort: without a key the frame is counted as NoKey
		}
	}
	plaintext, res = c.Receiver.Process(frame)
	return plaintext, res, nil
}

// Close ends the frame stream.
func (c *Client) Close() {
	if c.body != nil {
		c.body.Close()
	}
}
