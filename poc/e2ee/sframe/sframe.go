// Package sframe implements SFrame frame encryption as specified in RFC 9605,
// limited to the two AES-GCM cipher suites:
//
//	AES_128_GCM_SHA256_128 (0x0004)
//	AES_256_GCM_SHA512_128 (0x0005)
//
// Everything here follows the RFC literally: the header layout (Section 4.3),
// the key/salt derivation (Section 4.4.2), nonce and AAD construction and
// encryption/decryption (Sections 4.4.3 and 4.4.4). The AES-CTR-HMAC suites
// (0x0001..0x0003) are intentionally not implemented.
//
// Replay protection is NOT part of SFrame (RFC 9605, Section 9.3): the caller
// must reject counters it has already accepted. See internal/viewer.
package sframe

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hkdf"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/binary"
	"errors"
	"fmt"
	"hash"
	"math"
)

// CipherSuite is an SFrame cipher suite identifier (RFC 9605, Section 8.1).
type CipherSuite uint16

const (
	AES128GCMSHA256128 CipherSuite = 0x0004
	AES256GCMSHA512128 CipherSuite = 0x0005
)

// MaxHeaderLen is the longest possible header: config byte + 8-byte KID + 8-byte CTR.
const MaxHeaderLen = 17

var (
	ErrUnsupportedSuite = errors.New("sframe: unsupported cipher suite")
	ErrHeader           = errors.New("sframe: malformed header")
	ErrWrongKID         = errors.New("sframe: ciphertext KID does not match this key")
	ErrAuth             = errors.New("sframe: authentication failed")
	ErrCounterExhausted = errors.New("sframe: counter space exhausted for this key")
)

// params are the constants of Table 1 in RFC 9605, Section 4.5.
type params struct {
	nk      int // AEAD key size
	nn      int // AEAD nonce size
	nt      int // AEAD tag size
	newHash func() hash.Hash
}

func suiteParams(s CipherSuite) (params, error) {
	switch s {
	case AES128GCMSHA256128:
		return params{nk: 16, nn: 12, nt: 16, newHash: sha256.New}, nil
	case AES256GCMSHA512128:
		return params{nk: 32, nn: 12, nt: 16, newHash: sha512.New}, nil
	}
	return params{}, fmt.Errorf("%w: 0x%04x", ErrUnsupportedSuite, uint16(s))
}

// ---- Header (RFC 9605, Section 4.3) ----------------------------------------
//
//	 0 1 2 3 4 5 6 7
//	+-+-+-+-+-+-+-+-+------------+------------+
//	|X|  K  |Y|  C  |   KID...   |   CTR...   |
//	+-+-+-+-+-+-+-+-+------------+------------+
//
// A value in 0..7 is carried in the 3-bit field (flag 0). Otherwise the flag
// is 1, the field holds (length-1) and the value follows as a minimal-length
// big-endian integer, KID first, CTR second.

// minimalBE returns v as a big-endian integer without leading zero bytes
// (at least one byte).
func minimalBE(v uint64) []byte {
	var b [8]byte
	binary.BigEndian.PutUint64(b[:], v)
	i := 0
	for i < 7 && b[i] == 0 {
		i++
	}
	return b[i:]
}

// EncodeHeader encodes the SFrame header for the given KID and CTR.
func EncodeHeader(kid, ctr uint64) []byte {
	out := make([]byte, 1, MaxHeaderLen)
	var config byte
	if kid < 8 {
		config |= byte(kid) << 4
	} else {
		b := minimalBE(kid)
		config |= 0x80 | byte(len(b)-1)<<4
		out = append(out, b...)
	}
	if ctr < 8 {
		config |= byte(ctr)
	} else {
		b := minimalBE(ctr)
		config |= 0x08 | byte(len(b)-1)
		out = append(out, b...)
	}
	out[0] = config
	return out
}

// DecodeHeader parses the SFrame header at the start of b and returns the KID,
// the CTR and the header length in bytes.
//
// The RFC requires senders to use the minimal encoding. Encodings that are not
// minimal are rejected here: they can never come from a conforming sender.
func DecodeHeader(b []byte) (kid, ctr uint64, n int, err error) {
	if len(b) < 1 {
		return 0, 0, 0, ErrHeader
	}
	config := b[0]
	n = 1
	field := func(extended bool, bits byte) (uint64, error) {
		if !extended {
			return uint64(bits), nil
		}
		length := int(bits) + 1
		if len(b) < n+length {
			return 0, ErrHeader
		}
		var v uint64
		for _, x := range b[n : n+length] {
			v = v<<8 | uint64(x)
		}
		if v < 8 || b[n] == 0 { // not minimal
			return 0, ErrHeader
		}
		n += length
		return v, nil
	}
	if kid, err = field(config&0x80 != 0, (config>>4)&0x07); err != nil {
		return 0, 0, 0, err
	}
	if ctr, err = field(config&0x08 != 0, config&0x07); err != nil {
		return 0, 0, 0, err
	}
	return kid, ctr, n, nil
}

// ---- Key derivation (RFC 9605, Section 4.4.2) -------------------------------
//
//	sframe_secret     = HKDF-Extract("", base_key)
//	sframe_key_label  = "SFrame 1.0 Secret key "  + KID(8 bytes BE) + cipher_suite(2 bytes BE)
//	sframe_key        = HKDF-Expand(sframe_secret, sframe_key_label, AEAD.Nk)
//	sframe_salt_label = "SFrame 1.0 Secret salt " + KID(8 bytes BE) + cipher_suite(2 bytes BE)
//	sframe_salt       = HKDF-Expand(sframe_secret, sframe_salt_label, AEAD.Nn)

func label(prefix string, kid uint64, suite CipherSuite) []byte {
	out := append([]byte(prefix), make([]byte, 10)...)
	binary.BigEndian.PutUint64(out[len(prefix):], kid)
	binary.BigEndian.PutUint16(out[len(prefix)+8:], uint16(suite))
	return out
}

func keyLabel(kid uint64, suite CipherSuite) []byte {
	return label("SFrame 1.0 Secret key ", kid, suite)
}

func saltLabel(kid uint64, suite CipherSuite) []byte {
	return label("SFrame 1.0 Secret salt ", kid, suite)
}

func extractSecret(p params, baseKey []byte) ([]byte, error) {
	return hkdf.Extract(p.newHash, baseKey, nil) // nil salt is the RFC's ""
}

// DeriveKeySalt derives sframe_key and sframe_salt from base_key for a KID.
func DeriveKeySalt(suite CipherSuite, kid uint64, baseKey []byte) (key, salt []byte, err error) {
	p, err := suiteParams(suite)
	if err != nil {
		return nil, nil, err
	}
	if len(baseKey) == 0 {
		return nil, nil, errors.New("sframe: empty base key")
	}
	secret, err := extractSecret(p, baseKey)
	if err != nil {
		return nil, nil, err
	}
	if key, err = hkdf.Expand(p.newHash, secret, string(keyLabel(kid, suite)), p.nk); err != nil {
		return nil, nil, err
	}
	if salt, err = hkdf.Expand(p.newHash, secret, string(saltLabel(kid, suite)), p.nn); err != nil {
		return nil, nil, err
	}
	return key, salt, nil
}

// ---- Encryption / decryption (RFC 9605, Sections 4.4.3 and 4.4.4) ----------

// keyState is the derived (sframe_key, sframe_salt) pair of one KID.
type keyState struct {
	kid  uint64
	aead cipher.AEAD
	salt []byte
}

func newKeyState(suite CipherSuite, kid uint64, baseKey []byte) (*keyState, error) {
	key, salt, err := DeriveKeySalt(suite, kid, baseKey)
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block) // 12-byte nonce, 16-byte tag
	if err != nil {
		return nil, err
	}
	if p, _ := suiteParams(suite); aead.NonceSize() != p.nn || aead.Overhead() != p.nt {
		return nil, errors.New("sframe: AEAD does not match the cipher suite constants")
	}
	return &keyState{kid: kid, aead: aead, salt: salt}, nil
}

// nonce = sframe_salt XOR encode_big_endian(CTR, AEAD.Nn)
func (k *keyState) nonce(ctr uint64) []byte {
	n := make([]byte, len(k.salt))
	binary.BigEndian.PutUint64(n[len(n)-8:], ctr)
	for i := range n {
		n[i] ^= k.salt[i]
	}
	return n
}

// seal returns header || AEAD.Encrypt(sframe_key, nonce, header || metadata, plaintext).
func (k *keyState) seal(ctr uint64, metadata, plaintext []byte) []byte {
	header := EncodeHeader(k.kid, ctr)
	aad := append(append([]byte{}, header...), metadata...)
	out := make([]byte, len(header), len(header)+len(plaintext)+k.aead.Overhead())
	copy(out, header)
	return k.aead.Seal(out, k.nonce(ctr), plaintext, aad)
}

func (k *keyState) open(metadata, ciphertext []byte) (plaintext []byte, ctr uint64, err error) {
	kid, ctr, n, err := DecodeHeader(ciphertext)
	if err != nil {
		return nil, 0, err
	}
	if kid != k.kid {
		return nil, 0, ErrWrongKID
	}
	aad := append(append([]byte{}, ciphertext[:n]...), metadata...)
	plaintext, err = k.aead.Open(nil, k.nonce(ctr), ciphertext[n:], aad)
	if err != nil {
		return nil, 0, ErrAuth
	}
	return plaintext, ctr, nil
}

// Encryptor encrypts frames under one base_key / KID. A base_key is usable
// for encryption or for decryption, never both (RFC 9605, Section 4.4.1), so
// this type has no decrypt method. The counter starts at 0 and is incremented
// after every encryption, which makes every (KID, CTR) pair unique.
// An Encryptor is not safe for concurrent use.
type Encryptor struct {
	k         *keyState
	next      uint64
	exhausted bool
}

// NewEncryptor derives the encryption key for kid from baseKey.
func NewEncryptor(suite CipherSuite, kid uint64, baseKey []byte) (*Encryptor, error) {
	k, err := newKeyState(suite, kid, baseKey)
	if err != nil {
		return nil, err
	}
	return &Encryptor{k: k}, nil
}

// KID returns the key id written into every header.
func (e *Encryptor) KID() uint64 { return e.k.kid }

// Encrypt produces the SFrame ciphertext (header, encrypted data, tag) for
// plaintext and returns the counter that was used. metadata is authenticated
// but not transmitted; the receiver must supply the same bytes.
func (e *Encryptor) Encrypt(metadata, plaintext []byte) (ciphertext []byte, ctr uint64, err error) {
	if e.exhausted {
		return nil, 0, ErrCounterExhausted
	}
	ctr = e.next
	ciphertext = e.k.seal(ctr, metadata, plaintext)
	if e.next == math.MaxUint64 {
		e.exhausted = true
	} else {
		e.next++
	}
	return ciphertext, ctr, nil
}

// Decryptor decrypts frames of one base_key / KID.
type Decryptor struct{ k *keyState }

// NewDecryptor derives the decryption key for kid from baseKey.
func NewDecryptor(suite CipherSuite, kid uint64, baseKey []byte) (*Decryptor, error) {
	k, err := newKeyState(suite, kid, baseKey)
	if err != nil {
		return nil, err
	}
	return &Decryptor{k: k}, nil
}

// Decrypt authenticates and decrypts an SFrame ciphertext and returns the
// plaintext and the counter from its header. It does not check for replays.
func (d *Decryptor) Decrypt(metadata, ciphertext []byte) (plaintext []byte, ctr uint64, err error) {
	return d.k.open(metadata, ciphertext)
}
