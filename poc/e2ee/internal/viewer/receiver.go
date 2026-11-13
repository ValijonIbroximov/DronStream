// Package viewer is the Go counterpart of the browser viewer: the same
// receive rules (viewer/src/receiver.js mirrors this file), used by the
// automated tests and by cmd/receiver.
package viewer

import (
	"dronstream-poc-e2ee/internal/envelope"
	"dronstream-poc-e2ee/sframe"
)

// Result says what happened to one received frame.
type Result int

const (
	Decrypted   Result = iota // authenticated and decrypted
	AuthFailure               // malformed, or failed AEAD authentication
	Replay                    // counter not higher than the last accepted one, or an old epoch
	NoKey                     // no key for the epoch (KID) named in the header
)

func (r Result) String() string {
	return [...]string{"decrypted", "auth-failure", "replay-rejected", "no-key"}[r]
}

// Stats are the counters the viewer shows.
type Stats struct {
	Received        uint64
	Decrypted       uint64
	AuthFailures    uint64
	ReplaysRejected uint64
	NoKey           uint64
	Epoch           uint64 // highest epoch from which a frame was accepted; 0 = none yet
}

// Receiver applies SFrame decryption plus the application rules that SFrame
// leaves to the application (RFC 9605, Sections 9.1 and 9.3):
//
//   - within one KID the counter must be strictly higher than the last
//     accepted one (the transport is an ordered byte stream, so no reordering
//     window is needed); anything else is a replay
//   - epochs only move forward: once a frame of epoch N was accepted, frames
//     and keys of older epochs are refused and their keys are deleted
type Receiver struct {
	meta  []byte
	keys  map[uint64]*sframe.Decryptor
	last  map[uint64]uint64 // highest accepted CTR per KID
	Stats Stats
}

// NewReceiver creates a receiver for one stream.
func NewReceiver(stream string) *Receiver {
	return &Receiver{
		meta: envelope.FrameMetadata(stream),
		keys: map[uint64]*sframe.Decryptor{},
		last: map[uint64]uint64{},
	}
}

// AddKey installs the base key of an epoch. Keys for epochs that are already
// behind, or for which a key is already installed, are ignored.
func (r *Receiver) AddKey(epoch uint64, suite sframe.CipherSuite, baseKey []byte) error {
	if epoch < r.Stats.Epoch || r.keys[epoch] != nil {
		return nil
	}
	dec, err := sframe.NewDecryptor(suite, epoch, baseKey)
	if err != nil {
		return err
	}
	r.keys[epoch] = dec
	return nil
}

// HasKey reports whether a key for the epoch is installed.
func (r *Receiver) HasKey(epoch uint64) bool { return r.keys[epoch] != nil }

// Process handles one SFrame ciphertext as received from the relay.
func (r *Receiver) Process(frame []byte) (plaintext []byte, res Result) {
	r.Stats.Received++
	kid, ctr, _, err := sframe.DecodeHeader(frame)
	if err != nil {
		r.Stats.AuthFailures++
		return nil, AuthFailure
	}
	if kid < r.Stats.Epoch {
		r.Stats.ReplaysRejected++
		return nil, Replay
	}
	dec := r.keys[kid]
	if dec == nil {
		r.Stats.NoKey++
		return nil, NoKey
	}
	if last, seen := r.last[kid]; seen && ctr <= last {
		r.Stats.ReplaysRejected++
		return nil, Replay
	}
	plaintext, _, err = dec.Decrypt(r.meta, frame)
	if err != nil {
		r.Stats.AuthFailures++
		return nil, AuthFailure
	}
	// Only an authenticated frame may move the replay counter or the epoch.
	r.last[kid] = ctr
	if kid > r.Stats.Epoch {
		r.Stats.Epoch = kid
		for old := range r.keys {
			if old < kid {
				delete(r.keys, old)
				delete(r.last, old)
			}
		}
	}
	r.Stats.Decrypted++
	return plaintext, Decrypted
}
