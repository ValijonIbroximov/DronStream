package e2e

import (
	"bytes"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"flag"
	"io"
	"os"
	"testing"

	"dronstream-poc-e2ee/internal/envelope"
	"dronstream-poc-e2ee/internal/h264"
	"dronstream-poc-e2ee/internal/viewer"
	"dronstream-poc-e2ee/internal/wire"
	"dronstream-poc-e2ee/sframe"
)

// Golden files prove that the Go and the JavaScript implementations
// understand each other's bytes (HPKE envelope + SFrame frames + receive
// rules). Both files have the same layout and are checked by both sides:
//
//	testdata/golden/go-to-js.json  written here (-update), read by Go and by Node
//	testdata/golden/js-to-go.json  written by viewer/test/gen-golden.mjs, read by Go and by Node
//
// The recipient key is the public example key pair of RFC 9180 Appendix
// A.3.1 and the base keys are fixed patterns: nothing in these files is a
// secret. The HPKE ephemeral key is random, so regenerating a file changes
// its "sealed" fields; that is why the files are committed.
var update = flag.Bool("update", false, "rewrite testdata/golden/go-to-js.json")

const (
	goldenGoToJS = "../testdata/golden/go-to-js.json"
	goldenJSToGo = "../testdata/golden/js-to-go.json"
)

type goldenFrame struct {
	Expect    string `json:"expect"`              // decrypted | auth-failure | replay-rejected | no-key
	Plaintext string `json:"plaintext,omitempty"` // base64, only for decrypted frames
	Note      string `json:"note"`
}

type goldenFile struct {
	About     string `json:"about"`
	Stream    string `json:"stream"`
	Recipient struct {
		Source      string `json:"source"`
		SK          string `json:"sk"` // hex, RFC 9180 A.3.1 skRm
		PK          string `json:"pk"` // hex, RFC 9180 A.3.1 pkRm
		Fingerprint string `json:"fingerprint"`
	} `json:"recipient"`
	Envelopes         []envelope.Envelope `json:"envelopes"`
	EnvelopesRejected int                 `json:"envelopes_rejected"`
	Wire              string              `json:"wire"` // base64 of the length-prefixed frame stream
	Frames            []goldenFrame       `json:"frames"`
	Stats             struct {
		Received        uint64 `json:"received"`
		Decrypted       uint64 `json:"decrypted"`
		AuthFailures    uint64 `json:"auth_failures"`
		ReplaysRejected uint64 `json:"replays_rejected"`
		NoKey           uint64 `json:"no_key"`
		Epoch           uint64 `json:"epoch"`
	} `json:"expected_stats"`
}

func patternKey(first byte) []byte {
	k := make([]byte, 32)
	for i := range k {
		k[i] = first + byte(i)
	}
	return k
}

// writeGoldenGoToJS builds the scenario with the Go implementation.
func writeGoldenGoToJS(t *testing.T) {
	var rfc struct{ SkRm, PkRm string }
	raw, err := os.ReadFile("../testdata/rfc9180-a3-base.json")
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, &rfc); err != nil {
		t.Fatal(err)
	}
	pk, _ := hex.DecodeString(rfc.PkRm)
	fp, err := envelope.FingerprintOf(pk)
	if err != nil {
		t.Fatal(err)
	}

	const stream, suite = "golden-go", sframe.AES256GCMSHA512128
	var g goldenFile
	g.About = "Go to JS interop fixture: HPKE envelopes and SFrame frames produced by the Go code. " +
		"Regenerate with: go test ./e2e -run TestGolden -update"
	g.Stream = stream
	g.Recipient.Source = "RFC 9180 Appendix A.3.1 example key pair (public test vector, not a secret)"
	g.Recipient.SK, g.Recipient.PK, g.Recipient.Fingerprint = rfc.SkRm, rfc.PkRm, fp.String()

	keys := [][]byte{patternKey(0x00), patternKey(0x20), patternKey(0x40)} // epochs 1, 2, 3
	for epoch := uint64(1); epoch <= 2; epoch++ {
		env, err := envelope.Seal(pk, stream, epoch, suite, keys[epoch-1])
		if err != nil {
			t.Fatal(err)
		}
		g.Envelopes = append(g.Envelopes, env)
	}
	relabelled := g.Envelopes[1] // the epoch 2 envelope presented as epoch 3: must not open
	relabelled.Epoch = 3
	g.Envelopes = append(g.Envelopes, relabelled)
	g.EnvelopesRejected = 1

	meta := envelope.FrameMetadata(stream)
	enc := map[uint64]*sframe.Encryptor{}
	for epoch := uint64(1); epoch <= 3; epoch++ {
		if enc[epoch], err = sframe.NewEncryptor(suite, epoch, keys[epoch-1]); err != nil {
			t.Fatal(err)
		}
	}
	units := h264.Synthetic(12, 4)
	var stream_ bytes.Buffer
	var sent [][]byte
	add := func(frame []byte, expect string, plaintext []byte, note string) {
		wire.WriteFrame(&stream_, frame)
		sent = append(sent, frame)
		f := goldenFrame{Expect: expect, Note: note}
		if expect == "decrypted" {
			f.Plaintext = base64.StdEncoding.EncodeToString(plaintext)
		}
		g.Frames = append(g.Frames, f)
	}
	seal := func(epoch uint64, unit []byte) []byte {
		ct, _, err := enc[epoch].Encrypt(meta, unit)
		if err != nil {
			t.Fatal(err)
		}
		return ct
	}
	for i := 0; i < 6; i++ {
		add(seal(1, units[i]), "decrypted", units[i], "epoch 1")
	}
	tampered := seal(1, units[6])
	tampered[len(tampered)/2] ^= 0x01
	add(tampered, "auth-failure", nil, "epoch 1, one bit flipped in transit")
	add(seal(1, units[7]), "decrypted", units[7], "epoch 1, stream continues after the bad frame")
	add(sent[2], "replay-rejected", nil, "third frame sent again")
	for i := 8; i < 11; i++ {
		add(seal(2, units[i]), "decrypted", units[i], "epoch 2 (key change)")
	}
	add(sent[7], "replay-rejected", nil, "frame of the old epoch 1 sent again")
	add(seal(3, units[11]), "no-key", nil, "epoch 3: only a re-labelled envelope exists, which must not open")
	add(seal(2, units[0]), "decrypted", units[0], "epoch 2 continues")

	g.Wire = base64.StdEncoding.EncodeToString(stream_.Bytes())
	g.Stats.Received, g.Stats.Decrypted, g.Stats.AuthFailures = 15, 11, 1
	g.Stats.ReplaysRejected, g.Stats.NoKey, g.Stats.Epoch = 2, 1, 2

	out, err := json.MarshalIndent(g, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll("../testdata/golden", 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(goldenGoToJS, append(out, '\n'), 0o644); err != nil {
		t.Fatal(err)
	}
	t.Logf("wrote %s", goldenGoToJS)
}

// checkGolden replays a golden file through the Go receiver.
func checkGolden(t *testing.T, path string) {
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("%v (see the comment at the top of golden_test.go)", err)
	}
	var g goldenFile
	if err := json.Unmarshal(raw, &g); err != nil {
		t.Fatal(err)
	}
	sk, _ := hex.DecodeString(g.Recipient.SK)
	priv, err := envelope.NewPrivateKey(sk)
	if err != nil {
		t.Fatal(err)
	}
	fp, _ := envelope.FingerprintOf(priv.PublicKey().Bytes())
	if hex.EncodeToString(priv.PublicKey().Bytes()) != g.Recipient.PK || fp.String() != g.Recipient.Fingerprint {
		t.Fatal("recipient public key or fingerprint in the file does not match the private key")
	}

	r := viewer.NewReceiver(g.Stream)
	rejected := 0
	for _, env := range g.Envelopes {
		baseKey, err := envelope.Open(priv, g.Stream, env)
		if err != nil {
			rejected++
			continue
		}
		if err := r.AddKey(env.Epoch, sframe.CipherSuite(env.Suite), baseKey); err != nil {
			t.Fatal(err)
		}
	}
	if rejected != g.EnvelopesRejected {
		t.Fatalf("%d envelopes failed to open, file expects %d", rejected, g.EnvelopesRejected)
	}

	wireBytes, err := base64.StdEncoding.DecodeString(g.Wire)
	if err != nil {
		t.Fatal(err)
	}
	stream := bytes.NewReader(wireBytes)
	for i, want := range g.Frames {
		frame, err := wire.ReadFrame(stream)
		if err != nil {
			t.Fatalf("frame %d: %v", i, err)
		}
		plaintext, res := r.Process(frame)
		if res.String() != want.Expect {
			t.Fatalf("frame %d (%s): %s, want %s", i, want.Note, res, want.Expect)
		}
		if want.Expect == "decrypted" && base64.StdEncoding.EncodeToString(plaintext) != want.Plaintext {
			t.Fatalf("frame %d (%s): plaintext differs", i, want.Note)
		}
	}
	if _, err := wire.ReadFrame(stream); err != io.EOF {
		t.Fatalf("wire has more frames than the file describes: %v", err)
	}
	s, w := r.Stats, g.Stats
	if s.Received != w.Received || s.Decrypted != w.Decrypted || s.AuthFailures != w.AuthFailures ||
		s.ReplaysRejected != w.ReplaysRejected || s.NoKey != w.NoKey || s.Epoch != w.Epoch {
		t.Fatalf("stats %+v, file expects %+v", s, w)
	}
	t.Logf("%s: %d envelopes opened, %d rejected; frames: %d decrypted, %d auth failures, %d replays rejected, %d without key",
		path, len(g.Envelopes)-rejected, rejected, s.Decrypted, s.AuthFailures, s.ReplaysRejected, s.NoKey)
}

// Go reads what Go wrote (and rewrites it with -update).
func TestGoldenGoToJS(t *testing.T) {
	if *update {
		writeGoldenGoToJS(t)
	}
	checkGolden(t, goldenGoToJS)
}

// Go reads what the JavaScript implementation wrote: HPKE envelopes sealed
// by @hpke/core and frames encrypted by viewer/src/sframe.js.
func TestGoldenJSToGo(t *testing.T) {
	checkGolden(t, goldenJSToGo)
}
