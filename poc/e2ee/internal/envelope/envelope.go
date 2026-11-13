// Package envelope delivers an SFrame base key to one approved viewer by
// sealing it to the viewer's public key with HPKE (RFC 9180), base mode:
//
//	KEM  DHKEM(P-256, HKDF-SHA256)  0x0010
//	KDF  HKDF-SHA256                0x0001
//	AEAD AES-256-GCM                0x0002
//
// The HPKE implementation is the Go standard library (crypto/hpke); nothing
// in this file implements cryptography itself. The only things defined here
// are the fingerprint format, the HPKE "info" string and the JSON envelope.
//
// Limitation (see README_UZ.md): HPKE base mode does not authenticate the
// sender. A viewer cannot tell who sealed an envelope.
package envelope

import (
	"crypto/ecdh"
	"crypto/hpke"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"dronstream-poc-e2ee/sframe"
)

// Version is the envelope format version.
const Version = 1

// PublicKeyLen is the size of an uncompressed SEC1 P-256 point (0x04 || X || Y),
// which is also the HPKE SerializePublicKey format for DHKEM(P-256).
const PublicKeyLen = 65

// infoLabel domain-separates this use of HPKE from any other.
const infoLabel = "DronStream E2EE PoC v1 sframe-base-key"

func kem() hpke.KEM   { return hpke.DHKEM(ecdh.P256()) }
func kdf() hpke.KDF   { return hpke.HKDFSHA256() }
func aead() hpke.AEAD { return hpke.AES256GCM() }

// Fingerprint identifies a viewer public key: SHA-256 over its 65-byte
// uncompressed encoding. Operator and viewer compare it over a separate
// channel before the operator approves.
type Fingerprint [sha256.Size]byte

// FingerprintOf validates pub as a P-256 point and returns its fingerprint.
func FingerprintOf(pub []byte) (Fingerprint, error) {
	if len(pub) != PublicKeyLen || pub[0] != 0x04 {
		return Fingerprint{}, errors.New("envelope: public key must be a 65-byte uncompressed P-256 point")
	}
	if _, err := kem().NewPublicKey(pub); err != nil {
		return Fingerprint{}, fmt.Errorf("envelope: invalid P-256 public key: %w", err)
	}
	return sha256.Sum256(pub), nil
}

// Hex returns the fingerprint as 64 lower-case hex digits (used as the
// recipient address on the relay).
func (f Fingerprint) Hex() string { return hex.EncodeToString(f[:]) }

// String returns the full fingerprint for humans: 16 groups of 4 hex digits.
// The viewer page prints exactly the same string.
func (f Fingerprint) String() string {
	h := f.Hex()
	groups := make([]string, 0, 16)
	for i := 0; i < len(h); i += 4 {
		groups = append(groups, h[i:i+4])
	}
	return strings.Join(groups, " ")
}

// ParseFingerprint accepts the Hex or String form (spaces, colons and dashes
// are ignored). The full 256 bits are required; prefixes are not accepted.
func ParseFingerprint(s string) (Fingerprint, error) {
	clean := strings.NewReplacer(" ", "", ":", "", "-", "", "\t", "").Replace(strings.ToLower(strings.TrimSpace(s)))
	var f Fingerprint
	if len(clean) != 2*len(f) {
		return f, fmt.Errorf("envelope: a full fingerprint has %d hex digits, got %d", 2*len(f), len(clean))
	}
	if _, err := hex.Decode(f[:], []byte(clean)); err != nil {
		return f, errors.New("envelope: fingerprint is not hexadecimal")
	}
	return f, nil
}

// Info is the HPKE "info" parameter. It binds the envelope to the stream, the
// key epoch, the SFrame cipher suite and the recipient key, so an envelope
// cannot be re-labelled as belonging to another stream, epoch or recipient:
//
//	label || 0x00 || uint16(len(stream)) || stream || uint64(epoch) || uint16(suite) || fingerprint(32)
func Info(stream string, epoch uint64, suite sframe.CipherSuite, to Fingerprint) []byte {
	out := append([]byte(infoLabel), 0x00)
	out = binary.BigEndian.AppendUint16(out, uint16(len(stream)))
	out = append(out, stream...)
	out = binary.BigEndian.AppendUint64(out, epoch)
	out = binary.BigEndian.AppendUint16(out, uint16(suite))
	return append(out, to[:]...)
}

// Envelope is what travels through the relay. Every clear field is also bound
// into the HPKE info, so changing any of them makes Open fail.
type Envelope struct {
	V      int    `json:"v"`
	Stream string `json:"stream"`
	Epoch  uint64 `json:"epoch"`
	Suite  uint16 `json:"suite"`
	To     string `json:"to"`     // hex fingerprint of the recipient public key
	Sealed string `json:"sealed"` // base64(enc || ciphertext), RFC 9180 single-shot
}

// Seal encrypts baseKey for the holder of pub.
func Seal(pub []byte, stream string, epoch uint64, suite sframe.CipherSuite, baseKey []byte) (Envelope, error) {
	fp, err := FingerprintOf(pub)
	if err != nil {
		return Envelope{}, err
	}
	if len(stream) == 0 || len(stream) > 255 {
		return Envelope{}, errors.New("envelope: bad stream id")
	}
	pk, err := kem().NewPublicKey(pub)
	if err != nil {
		return Envelope{}, err
	}
	sealed, err := hpke.Seal(pk, kdf(), aead(), Info(stream, epoch, suite, fp), baseKey)
	if err != nil {
		return Envelope{}, err
	}
	return Envelope{
		V:      Version,
		Stream: stream,
		Epoch:  epoch,
		Suite:  uint16(suite),
		To:     fp.Hex(),
		Sealed: base64.StdEncoding.EncodeToString(sealed),
	}, nil
}

// Open decrypts an envelope with the recipient private key. The caller states
// which stream it expects; the recipient fingerprint is recomputed from the
// private key, never taken from the envelope.
func Open(priv hpke.PrivateKey, stream string, env Envelope) (baseKey []byte, err error) {
	if env.V != Version {
		return nil, fmt.Errorf("envelope: unsupported version %d", env.V)
	}
	if env.Stream != stream {
		return nil, errors.New("envelope: addressed to another stream")
	}
	fp := Fingerprint(sha256.Sum256(priv.PublicKey().Bytes()))
	if env.To != fp.Hex() {
		return nil, errors.New("envelope: addressed to another recipient")
	}
	sealed, err := base64.StdEncoding.DecodeString(env.Sealed)
	if err != nil {
		return nil, errors.New("envelope: bad base64")
	}
	baseKey, err = hpke.Open(priv, kdf(), aead(), Info(stream, env.Epoch, sframe.CipherSuite(env.Suite), fp), sealed)
	if err != nil {
		return nil, fmt.Errorf("envelope: HPKE open failed: %w", err)
	}
	return baseKey, nil
}

// FrameMetadata is the SFrame "metadata" input (RFC 9605, Section 4.4.3) used
// for every frame of a stream. It is authenticated but not transmitted, so a
// frame encrypted for one stream does not verify on another.
func FrameMetadata(stream string) []byte {
	return []byte("DronStream E2EE PoC v1 frame stream=" + stream)
}

// GenerateKey creates a viewer key pair (used by the Go test receiver; the
// browser generates its own non-extractable key with WebCrypto).
func GenerateKey() (hpke.PrivateKey, error) { return kem().GenerateKey() }

// NewPrivateKey loads a P-256 private key from its 32-byte scalar (tests only).
func NewPrivateKey(scalar []byte) (hpke.PrivateKey, error) { return kem().NewPrivateKey(scalar) }
