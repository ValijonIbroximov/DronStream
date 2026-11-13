package envelope

import (
	"bytes"
	"crypto/ecdh"
	"crypto/hpke"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"os"
	"strings"
	"testing"

	"dronstream-poc-e2ee/sframe"
)

func unhex(t *testing.T, s string) []byte {
	t.Helper()
	b, err := hex.DecodeString(s)
	if err != nil {
		t.Fatal(err)
	}
	return b
}

// TestRFC9180KnownAnswer checks the HPKE library against RFC 9180 Appendix
// A.3.1. Same KEM and KDF as the envelope; the vector's AEAD is AES-128-GCM
// (RFC 9180 has no P-256 vector with AES-256-GCM).
func TestRFC9180KnownAnswer(t *testing.T) {
	raw, err := os.ReadFile("../../testdata/rfc9180-a3-base.json")
	if err != nil {
		t.Fatal(err)
	}
	var v struct {
		Info, PkRm, SkRm, Enc string
		Encryptions           []struct {
			Seq         int
			PT, AAD, CT string
		}
	}
	if err := json.Unmarshal(raw, &v); err != nil {
		t.Fatal(err)
	}
	k := hpke.DHKEM(ecdh.P256())
	sk, err := k.NewPrivateKey(unhex(t, v.SkRm))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(sk.PublicKey().Bytes(), unhex(t, v.PkRm)) {
		t.Fatal("public key derived from skRm differs from pkRm")
	}
	r, err := hpke.NewRecipient(unhex(t, v.Enc), sk, hpke.HKDFSHA256(), hpke.AES128GCM(), unhex(t, v.Info))
	if err != nil {
		t.Fatal(err)
	}
	if len(v.Encryptions) != 3 {
		t.Fatalf("expected 3 encryptions, got %d", len(v.Encryptions))
	}
	for i, e := range v.Encryptions {
		if e.Seq != i {
			t.Fatalf("vector sequence numbers must be 0,1,2; got %d at %d", e.Seq, i)
		}
		pt, err := r.Open(unhex(t, e.AAD), unhex(t, e.CT))
		if err != nil || !bytes.Equal(pt, unhex(t, e.PT)) {
			t.Fatalf("seq %d: pt=%x err=%v", e.Seq, pt, err)
		}
	}
}

func TestSealOpenAndBinding(t *testing.T) {
	priv, err := GenerateKey()
	if err != nil {
		t.Fatal(err)
	}
	pub := priv.PublicKey().Bytes()
	baseKey := bytes.Repeat([]byte{7}, 32)
	env, err := Seal(pub, "s1", 3, sframe.AES256GCMSHA512128, baseKey)
	if err != nil {
		t.Fatal(err)
	}
	got, err := Open(priv, "s1", env)
	if err != nil || !bytes.Equal(got, baseKey) {
		t.Fatalf("open: %x %v", got, err)
	}
	if sealed, _ := base64.StdEncoding.DecodeString(env.Sealed); len(sealed) != PublicKeyLen+len(baseKey)+16 || bytes.Contains(sealed, baseKey) {
		t.Fatalf("sealed blob must be enc(65) || ciphertext || tag(16) and must not contain the key; got %d bytes", len(sealed))
	}

	// Each clear field is bound: changing it must make Open fail.
	mutations := map[string]func(e *Envelope){
		"epoch":  func(e *Envelope) { e.Epoch++ },
		"suite":  func(e *Envelope) { e.Suite = uint16(sframe.AES128GCMSHA256128) },
		"stream": func(e *Envelope) { e.Stream = "s2" },
		"to":     func(e *Envelope) { e.To = strings.Repeat("0", 64) },
		"v":      func(e *Envelope) { e.V = 2 },
	}
	for name, mutate := range mutations {
		bad := env
		mutate(&bad)
		if _, err := Open(priv, "s1", bad); err == nil {
			t.Errorf("envelope with modified %s was accepted", name)
		}
	}
	// Same envelope presented for another stream.
	if _, err := Open(priv, "s2", env); err == nil {
		t.Error("envelope accepted for another stream")
	}
	// Another key cannot open it, even if the address is rewritten to match.
	other, _ := GenerateKey()
	if _, err := Open(other, "s1", env); err == nil {
		t.Error("another key opened the envelope")
	}
	forged := env
	otherFP, _ := FingerprintOf(other.PublicKey().Bytes())
	forged.To = otherFP.Hex()
	if _, err := Open(other, "s1", forged); err == nil {
		t.Error("another key opened a re-addressed envelope")
	}
}

func TestFingerprintFormat(t *testing.T) {
	priv, _ := GenerateKey()
	fp, err := FingerprintOf(priv.PublicKey().Bytes())
	if err != nil {
		t.Fatal(err)
	}
	s := fp.String()
	if len(s) != 64+15 || len(strings.Fields(s)) != 16 {
		t.Fatalf("unexpected fingerprint format %q", s)
	}
	for _, in := range []string{s, fp.Hex(), strings.ToUpper(s), strings.ReplaceAll(s, " ", ":")} {
		back, err := ParseFingerprint(in)
		if err != nil || back != fp {
			t.Errorf("ParseFingerprint(%q): %v", in, err)
		}
	}
	// Prefixes and garbage are refused: the operator must supply all 256 bits.
	for _, in := range []string{"", fp.Hex()[:16], fp.Hex()[:63], fp.Hex() + "00", strings.Repeat("z", 64)} {
		if _, err := ParseFingerprint(in); err == nil {
			t.Errorf("ParseFingerprint(%q) accepted", in)
		}
	}
	// Invalid public keys are refused.
	for _, pub := range [][]byte{nil, make([]byte, 65), append([]byte{4}, make([]byte, 64)...), priv.PublicKey().Bytes()[:64]} {
		if _, err := FingerprintOf(pub); err == nil {
			t.Errorf("FingerprintOf accepted invalid key %x", pub)
		}
	}
}
