package sframe

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"testing"
)

// Official RFC 9605 test vectors, see ../testdata/SOURCES.txt.
const vectorFile = "../testdata/rfc9605-test-vectors.json"

type hexBytes []byte

func (h *hexBytes) UnmarshalJSON(b []byte) error {
	var s string
	if err := json.Unmarshal(b, &s); err != nil {
		return err
	}
	v, err := hex.DecodeString(s)
	*h = v
	return err
}

type vectors struct {
	Header []struct {
		KID     uint64   `json:"kid"`
		CTR     uint64   `json:"ctr"`
		Encoded hexBytes `json:"encoded"`
	} `json:"header"`
	SFrame []struct {
		CipherSuite     uint16   `json:"cipher_suite"`
		KID             uint64   `json:"kid"`
		CTR             uint64   `json:"ctr"`
		BaseKey         hexBytes `json:"base_key"`
		SFrameKeyLabel  hexBytes `json:"sframe_key_label"`
		SFrameSaltLabel hexBytes `json:"sframe_salt_label"`
		SFrameSecret    hexBytes `json:"sframe_secret"`
		SFrameKey       hexBytes `json:"sframe_key"`
		SFrameSalt      hexBytes `json:"sframe_salt"`
		Metadata        hexBytes `json:"metadata"`
		Nonce           hexBytes `json:"nonce"`
		AAD             hexBytes `json:"aad"`
		PT              hexBytes `json:"pt"`
		CT              hexBytes `json:"ct"`
	} `json:"sframe"`
}

func loadVectors(t *testing.T) vectors {
	t.Helper()
	raw, err := os.ReadFile(vectorFile)
	if err != nil {
		t.Fatal(err)
	}
	var v vectors
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatal(err)
	}
	return v
}

func TestRFC9605HeaderVectors(t *testing.T) {
	v := loadVectors(t)
	if len(v.Header) != 289 {
		t.Fatalf("expected 289 header vectors, file has %d", len(v.Header))
	}
	for _, h := range v.Header {
		if got := EncodeHeader(h.KID, h.CTR); !bytes.Equal(got, h.Encoded) {
			t.Errorf("encode kid=%d ctr=%d: got %x want %x", h.KID, h.CTR, got, h.Encoded)
		}
		kid, ctr, n, err := DecodeHeader(h.Encoded)
		if err != nil || kid != h.KID || ctr != h.CTR || n != len(h.Encoded) {
			t.Errorf("decode %x: got kid=%d ctr=%d n=%d err=%v", h.Encoded, kid, ctr, n, err)
		}
	}
	t.Logf("header vectors passed: %d/%d", len(v.Header), len(v.Header))
}

func TestRFC9605SFrameVectors(t *testing.T) {
	v := loadVectors(t)
	ran, skipped := 0, 0
	for _, c := range v.SFrame {
		suite := CipherSuite(c.CipherSuite)
		p, err := suiteParams(suite)
		if errors.Is(err, ErrUnsupportedSuite) {
			skipped++ // AES-CTR-HMAC suites 1..3: not implemented in this PoC
			continue
		}
		ran++

		// Key derivation, every intermediate value.
		if got := keyLabel(c.KID, suite); !bytes.Equal(got, c.SFrameKeyLabel) {
			t.Errorf("suite %d: key label %x want %x", suite, got, c.SFrameKeyLabel)
		}
		if got := saltLabel(c.KID, suite); !bytes.Equal(got, c.SFrameSaltLabel) {
			t.Errorf("suite %d: salt label %x want %x", suite, got, c.SFrameSaltLabel)
		}
		secret, err := extractSecret(p, c.BaseKey)
		if err != nil || !bytes.Equal(secret, c.SFrameSecret) {
			t.Errorf("suite %d: sframe_secret %x want %x (err %v)", suite, secret, c.SFrameSecret, err)
		}
		key, salt, err := DeriveKeySalt(suite, c.KID, c.BaseKey)
		if err != nil {
			t.Fatal(err)
		}
		if !bytes.Equal(key, c.SFrameKey) {
			t.Errorf("suite %d: sframe_key %x want %x", suite, key, c.SFrameKey)
		}
		if !bytes.Equal(salt, c.SFrameSalt) {
			t.Errorf("suite %d: sframe_salt %x want %x", suite, salt, c.SFrameSalt)
		}

		// Nonce and AAD.
		k, err := newKeyState(suite, c.KID, c.BaseKey)
		if err != nil {
			t.Fatal(err)
		}
		if got := k.nonce(c.CTR); !bytes.Equal(got, c.Nonce) {
			t.Errorf("suite %d: nonce %x want %x", suite, got, c.Nonce)
		}
		if got := append(EncodeHeader(c.KID, c.CTR), c.Metadata...); !bytes.Equal(got, c.AAD) {
			t.Errorf("suite %d: aad %x want %x", suite, got, c.AAD)
		}

		// Encrypt must reproduce the vector ciphertext exactly.
		if got := k.seal(c.CTR, c.Metadata, c.PT); !bytes.Equal(got, c.CT) {
			t.Errorf("suite %d: ct %x want %x", suite, got, c.CT)
		}

		// Decrypt through the public API.
		dec, err := NewDecryptor(suite, c.KID, c.BaseKey)
		if err != nil {
			t.Fatal(err)
		}
		pt, ctr, err := dec.Decrypt(c.Metadata, c.CT)
		if err != nil || !bytes.Equal(pt, c.PT) || ctr != c.CTR {
			t.Errorf("suite %d: decrypt got pt=%x ctr=%d err=%v", suite, pt, ctr, err)
		}
	}
	if ran != 2 {
		t.Fatalf("expected the 2 AES-GCM vectors (suites 4 and 5) to run, ran %d", ran)
	}
	t.Logf("sframe vectors: %d AES-GCM passed (suites 4, 5); %d AES-CTR-HMAC skipped (suites 1-3 not implemented)", ran, skipped)
}

func TestDecodeHeaderRejectsMalformed(t *testing.T) {
	for _, h := range []string{
		"",         // empty
		"08",       // CTR length 1 announced, no bytes
		"99012345", // KID 2 bytes + CTR 2 bytes announced, one byte short
		"0807",     // CTR 7 in extended form: not minimal
		"090001",   // CTR with a leading zero byte: not minimal
		"8005",     // KID 5 in extended form: not minimal
	} {
		b, _ := hex.DecodeString(h)
		if _, _, _, err := DecodeHeader(b); !errors.Is(err, ErrHeader) {
			t.Errorf("header %q: expected ErrHeader, got %v", h, err)
		}
	}
}

func TestEncryptorCountsUpAndDecryptorAuthenticates(t *testing.T) {
	baseKey := bytes.Repeat([]byte{0x42}, 32)
	meta := []byte("stream-A")
	for _, suite := range []CipherSuite{AES128GCMSHA256128, AES256GCMSHA512128} {
		enc, err := NewEncryptor(suite, 9, baseKey)
		if err != nil {
			t.Fatal(err)
		}
		dec, _ := NewDecryptor(suite, 9, baseKey)
		var first []byte
		for i := uint64(0); i < 20; i++ {
			pt := bytes.Repeat([]byte{byte(i)}, 100+int(i))
			ct, ctr, err := enc.Encrypt(meta, pt)
			if err != nil || ctr != i {
				t.Fatalf("encrypt %d: ctr=%d err=%v", i, ctr, err)
			}
			if i == 0 {
				first = ct
			}
			got, gotCtr, err := dec.Decrypt(meta, ct)
			if err != nil || gotCtr != i || !bytes.Equal(got, pt) {
				t.Fatalf("decrypt %d: ctr=%d err=%v", i, gotCtr, err)
			}
		}

		// Any single bit flip anywhere (header, data or tag) must be rejected.
		for i := range first {
			bad := append([]byte{}, first...)
			bad[i] ^= 0x01
			if pt, _, err := dec.Decrypt(meta, bad); err == nil {
				t.Fatalf("suite %d: bit flip at byte %d accepted (pt %x)", suite, i, pt)
			}
		}
		// Different metadata, different base key, different KID, truncation.
		if _, _, err := dec.Decrypt([]byte("stream-B"), first); !errors.Is(err, ErrAuth) {
			t.Errorf("wrong metadata: %v", err)
		}
		other, _ := NewDecryptor(suite, 9, bytes.Repeat([]byte{0x43}, 32))
		if _, _, err := other.Decrypt(meta, first); !errors.Is(err, ErrAuth) {
			t.Errorf("wrong base key: %v", err)
		}
		otherKID, _ := NewDecryptor(suite, 10, baseKey)
		if _, _, err := otherKID.Decrypt(meta, first); !errors.Is(err, ErrWrongKID) {
			t.Errorf("wrong KID: %v", err)
		}
		if _, _, err := dec.Decrypt(meta, first[:len(first)-1]); !errors.Is(err, ErrAuth) {
			t.Errorf("truncated: %v", err)
		}
	}
}

func TestUnsupportedSuites(t *testing.T) {
	for _, s := range []CipherSuite{0, 1, 2, 3, 6} {
		if _, err := NewEncryptor(s, 1, []byte("0123456789abcdef")); !errors.Is(err, ErrUnsupportedSuite) {
			t.Errorf("suite %d: expected ErrUnsupportedSuite, got %v", s, err)
		}
	}
}
