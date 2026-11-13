// Package source is the publisher simulator: it stands in for a future
// gateway / SDK publisher that holds the video in clear. It encrypts every
// access unit with SFrame, pushes ciphertext to the relay and manages who
// gets the key:
//
//   - epoch N has one random SFrame base key; the SFrame KID is the epoch number
//   - approve = start epoch N+1 with a fresh random key, sealed (HPKE) to every
//     member including the new one: a newcomer never gets an earlier key
//   - revoke  = start epoch N+1 with a fresh random key, sealed only to the
//     remaining members
//
// The operator identifies viewers only by the full SHA-256 fingerprint of
// their public key, computed here from the key bytes (never taken from the
// relay).
package source

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"dronstream-poc-e2ee/internal/envelope"
	"dronstream-poc-e2ee/internal/wire"
	"dronstream-poc-e2ee/sframe"
)

// baseKeyLen is the size of the random SFrame base_key of every epoch.
const baseKeyLen = 32

var (
	ErrUnknownFingerprint = errors.New("no join request has this fingerprint")
	ErrNotMember          = errors.New("this fingerprint is not an approved member")
	ErrAlreadyMember      = errors.New("this fingerprint is already approved")
)

// Member is a viewer key the source knows about.
type Member struct {
	Fingerprint envelope.Fingerprint
	Pub         []byte
	Label       string // sanitised, display only
}

// Source holds the only copies of the SFrame base keys on the sending side.
type Source struct {
	relay  string
	stream string
	suite  sframe.CipherSuite
	meta   []byte
	api    *http.Client // short control requests
	push   *http.Client // long-lived frame upload: no overall timeout

	opMu    sync.Mutex // serialises operator actions and guards the maps
	known   map[envelope.Fingerprint]Member
	members map[envelope.Fingerprint]Member
	revoked map[envelope.Fingerprint]bool

	encMu   sync.Mutex // guards the fields below; held while a frame is encrypted and written
	epoch   uint64
	baseKey []byte
	enc     *sframe.Encryptor
	sent    uint64
}

// New creates a source for one stream and generates the key of epoch 1.
func New(relayURL, stream string, suite sframe.CipherSuite) (*Source, error) {
	s := &Source{
		relay:   strings.TrimRight(relayURL, "/"),
		stream:  stream,
		suite:   suite,
		meta:    envelope.FrameMetadata(stream),
		api:     &http.Client{Timeout: 5 * time.Second},
		push:    &http.Client{},
		known:   map[envelope.Fingerprint]Member{},
		members: map[envelope.Fingerprint]Member{},
		revoked: map[envelope.Fingerprint]bool{},
	}
	key, err := newBaseKey()
	if err != nil {
		return nil, err
	}
	enc, err := sframe.NewEncryptor(suite, 1, key)
	if err != nil {
		return nil, err
	}
	s.epoch, s.baseKey, s.enc = 1, key, enc
	return s, nil
}

func newBaseKey() ([]byte, error) {
	key := make([]byte, baseKeyLen)
	if _, err := rand.Read(key); err != nil {
		return nil, err
	}
	return key, nil
}

// Epoch returns the current key epoch and the number of frames sent so far.
func (s *Source) Epoch() (epoch, framesSent uint64) {
	s.encMu.Lock()
	defer s.encMu.Unlock()
	return s.epoch, s.sent
}

func (s *Source) url(parts ...string) string {
	return s.relay + "/v1/streams/" + s.stream + "/" + strings.Join(parts, "/")
}

// ---- membership -------------------------------------------------------------

// cleanLabel keeps a short, harmless subset of the viewer-supplied label so
// it can be printed on the operator's terminal.
func cleanLabel(in string) string {
	var b strings.Builder
	for _, r := range in {
		ok := r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || strings.ContainsRune(" _.-", r)
		if ok && b.Len() < 32 {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// refreshJoins reads the join requests from the relay. Fingerprints are
// computed locally from the key bytes. Callers hold opMu.
func (s *Source) refreshJoins(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.url("joins"), nil)
	if err != nil {
		return err
	}
	resp, err := s.api.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("relay answered %s", resp.Status)
	}
	var joins []struct{ Pub, Label string }
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&joins); err != nil {
		return err
	}
	for _, j := range joins {
		pub, err := base64.StdEncoding.DecodeString(j.Pub)
		if err != nil {
			continue
		}
		fp, err := envelope.FingerprintOf(pub) // also rejects points that are not on the curve
		if err != nil {
			continue
		}
		if _, seen := s.known[fp]; !seen {
			s.known[fp] = Member{Fingerprint: fp, Pub: pub, Label: cleanLabel(j.Label)}
		}
	}
	return nil
}

func sorted(m map[envelope.Fingerprint]Member, keep func(Member) bool) []Member {
	var out []Member
	for _, v := range m {
		if keep(v) {
			out = append(out, v)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Fingerprint.Hex() < out[j].Fingerprint.Hex() })
	return out
}

// Lists returns the pending join requests, the approved members and the
// revoked keys, after asking the relay for new join requests.
func (s *Source) Lists(ctx context.Context) (pending, members, revoked []Member, err error) {
	s.opMu.Lock()
	defer s.opMu.Unlock()
	err = s.refreshJoins(ctx)
	pending = sorted(s.known, func(m Member) bool {
		_, member := s.members[m.Fingerprint]
		return !member && !s.revoked[m.Fingerprint]
	})
	members = sorted(s.members, func(Member) bool { return true })
	revoked = sorted(s.known, func(m Member) bool { return s.revoked[m.Fingerprint] })
	return pending, members, revoked, err
}

// sendKey seals the base key of an epoch to one member and posts the
// envelope to the relay.
func (s *Source) sendKey(ctx context.Context, m Member, epoch uint64, baseKey []byte) error {
	env, err := envelope.Seal(m.Pub, s.stream, epoch, s.suite, baseKey)
	if err != nil {
		return err
	}
	body, err := json.Marshal(env)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.url("envelopes", env.To), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.api.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return fmt.Errorf("relay refused the envelope: %s", resp.Status)
	}
	return nil
}

// Approve admits the viewer whose public key has exactly this fingerprint and
// starts a NEW epoch whose key is sealed to every member, the new one
// included. The fingerprint must be the one the viewer reported over a
// separate channel.
//
// A new member never receives the key of an epoch that began before it was
// approved: frames sent earlier (which it, or the relay, may have recorded as
// ciphertext) stay closed to it.
func (s *Source) Approve(ctx context.Context, fp envelope.Fingerprint) error {
	s.opMu.Lock()
	defer s.opMu.Unlock()
	if err := s.refreshJoins(ctx); err != nil {
		return err
	}
	m, ok := s.known[fp]
	if !ok {
		return ErrUnknownFingerprint
	}
	if _, dup := s.members[fp]; dup {
		return ErrAlreadyMember
	}
	s.members[fp] = m
	delete(s.revoked, fp)
	return s.rotate(ctx)
}

// Revoke removes a member and starts a new epoch. The revoked key never
// receives the new base key, so it cannot decrypt frames from then on.
func (s *Source) Revoke(ctx context.Context, fp envelope.Fingerprint) error {
	s.opMu.Lock()
	defer s.opMu.Unlock()
	if _, ok := s.members[fp]; !ok {
		return ErrNotMember
	}
	delete(s.members, fp)
	s.revoked[fp] = true
	return s.rotate(ctx)
}

// Rotate starts a new epoch without changing membership.
func (s *Source) Rotate(ctx context.Context) error {
	s.opMu.Lock()
	defer s.opMu.Unlock()
	return s.rotate(ctx)
}

// rotate creates the next epoch: a fresh random base key, sealed to every
// remaining member first, then put into use for encryption. Callers hold opMu.
//
// Envelopes are posted before the switch so that members can already fetch
// the key when the first frame of the new epoch arrives (RFC 9605, Section
// 4.4.1 discusses this ordering). The switch itself always happens, even if
// an envelope could not be delivered: a revocation must not be blocked.
func (s *Source) rotate(ctx context.Context) error {
	key, err := newBaseKey()
	if err != nil {
		return err
	}
	s.encMu.Lock()
	epoch := s.epoch + 1
	s.encMu.Unlock()
	enc, err := sframe.NewEncryptor(s.suite, epoch, key)
	if err != nil {
		return err
	}
	var errs []error
	for _, m := range s.members {
		if err := s.sendKey(ctx, m, epoch, key); err != nil {
			errs = append(errs, fmt.Errorf("member %s: %w", m.Fingerprint, err))
		}
	}
	s.encMu.Lock()
	s.epoch, s.baseKey, s.enc = epoch, key, enc
	s.encMu.Unlock()
	return errors.Join(errs...)
}

// ---- publishing -------------------------------------------------------------

// Publisher is an open upload of encrypted frames to the relay.
type Publisher struct {
	s    *Source
	pw   *io.PipeWriter
	done chan error
}

// OpenPublisher starts a streaming POST to the relay.
func (s *Source) OpenPublisher(ctx context.Context) (*Publisher, error) {
	pr, pw := io.Pipe()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.url("frames"), pr)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/octet-stream")
	p := &Publisher{s: s, pw: pw, done: make(chan error, 1)}
	go func() {
		resp, err := s.push.Do(req)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode/100 != 2 {
				err = fmt.Errorf("relay refused the frame stream: %s", resp.Status)
			}
		}
		if err == nil {
			err = io.ErrClosedPipe
		}
		pr.CloseWithError(err) // makes a blocked or later Send fail
		p.done <- err
	}()
	return p, nil
}

// Send encrypts one access unit with the current epoch key and writes the
// SFrame ciphertext to the relay. Encryption and writing happen under one
// lock, so counters appear on the wire in strictly increasing order.
func (p *Publisher) Send(accessUnit []byte) (epoch, ctr uint64, err error) {
	s := p.s
	s.encMu.Lock()
	defer s.encMu.Unlock()
	ciphertext, ctr, err := s.enc.Encrypt(s.meta, accessUnit)
	if err != nil {
		return 0, 0, err
	}
	if err := wire.WriteFrame(p.pw, ciphertext); err != nil {
		return 0, 0, err
	}
	s.sent++
	return s.epoch, ctr, nil
}

// Close ends the upload and waits for the relay's answer.
func (p *Publisher) Close() error {
	p.pw.Close()
	if err := <-p.done; err != nil && !errors.Is(err, io.ErrClosedPipe) {
		return err
	}
	return nil
}

// Run publishes the access units in an endless loop at fps frames per second
// until ctx is cancelled or the upload fails.
func (s *Source) Run(ctx context.Context, units [][]byte, fps int) error {
	if len(units) == 0 || fps <= 0 {
		return errors.New("source: nothing to publish")
	}
	p, err := s.OpenPublisher(ctx)
	if err != nil {
		return err
	}
	defer p.Close()
	tick := time.NewTicker(time.Second / time.Duration(fps))
	defer tick.Stop()
	for i := 0; ; i = (i + 1) % len(units) {
		if _, _, err := p.Send(units[i]); err != nil {
			return err
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-tick.C:
		}
	}
}

// ---- operator commands ------------------------------------------------------

// Help is the operator command summary.
const Help = `commands:
  list                    show pending join requests, members and revoked keys
  approve <fingerprint>   admit the viewer with this full fingerprint; starts a new epoch
                          (the newcomer gets only the new key, never an earlier one)
  revoke <fingerprint>    remove a member and start a new key epoch
  rotate                  start a new key epoch for the current members
  status                  show epoch and frame counters
  help                    this text
Compare the fingerprint with the viewer over a separate channel (voice, in
person) before approving. Type the fingerprint the VIEWER reports to you.`

// Command executes one operator command line and returns the text to show.
func (s *Source) Command(ctx context.Context, line string) string {
	fields := strings.Fields(line)
	if len(fields) == 0 {
		return ""
	}
	command, arg := strings.ToLower(fields[0]), strings.Join(fields[1:], "")
	switch command {
	case "list", "ls":
		return s.listText(ctx)
	case "status":
		epoch, sent := s.Epoch()
		return fmt.Sprintf("stream %q, epoch %d (SFrame KID %d), cipher suite 0x%04x, frames sent %d", s.stream, epoch, epoch, uint16(s.suite), sent)
	case "approve", "revoke":
		fp, err := envelope.ParseFingerprint(arg)
		if err != nil {
			return "REFUSED: " + err.Error()
		}
		if command == "approve" {
			err = s.Approve(ctx, fp)
		} else {
			err = s.Revoke(ctx, fp)
		}
		epoch, _ := s.Epoch()
		switch {
		case errors.Is(err, ErrUnknownFingerprint):
			return "REFUSED: " + err.Error() + ".\nIf the viewer reads you a fingerprint that is not in `list`, the path between you may be substituting keys. Do not approve a different one."
		case err != nil && command == "revoke" && !errors.Is(err, ErrNotMember):
			return fmt.Sprintf("revoked %s; now epoch %d. WARNING: %v", fp, epoch, err)
		case err != nil:
			return "REFUSED: " + err.Error()
		case command == "approve":
			return fmt.Sprintf("approved %s: now epoch %d, its key sealed to every member including this one", fp, epoch)
		default:
			return fmt.Sprintf("revoked %s; now epoch %d, key sealed only to the remaining members", fp, epoch)
		}
	case "rotate":
		err := s.Rotate(ctx)
		epoch, _ := s.Epoch()
		if err != nil {
			return fmt.Sprintf("now epoch %d. WARNING: %v", epoch, err)
		}
		return fmt.Sprintf("now epoch %d", epoch)
	case "help", "?":
		return Help
	}
	return "unknown command; try: help"
}

func (s *Source) listText(ctx context.Context) string {
	pending, members, revoked, err := s.Lists(ctx)
	var b strings.Builder
	if err != nil {
		fmt.Fprintf(&b, "WARNING: could not read join requests from the relay: %v\n", err)
	}
	section := func(title string, list []Member) {
		fmt.Fprintf(&b, "%s (%d):\n", title, len(list))
		for _, m := range list {
			fmt.Fprintf(&b, "  %s  label=%q\n", m.Fingerprint, m.Label)
		}
	}
	section("PENDING join requests", pending)
	section("MEMBERS", members)
	section("REVOKED", revoked)
	epoch, _ := s.Epoch()
	fmt.Fprintf(&b, "current epoch: %d", epoch)
	return b.String()
}
