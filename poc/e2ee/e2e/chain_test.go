package e2e

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"go/parser"
	"go/token"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"dronstream-poc-e2ee/internal/envelope"
	"dronstream-poc-e2ee/internal/h264"
	"dronstream-poc-e2ee/internal/source"
	"dronstream-poc-e2ee/internal/viewer"
	"dronstream-poc-e2ee/sframe"
)

// rawEnvelopes reads the envelopes the relay stores for one recipient,
// exactly as the relay (or anyone else on the path) can read them.
func rawEnvelopes(c *chain, recipient envelope.Fingerprint) []envelope.Envelope {
	c.t.Helper()
	resp, err := http.Get(c.url + "/v1/streams/" + testStream + "/envelopes/" + recipient.Hex())
	if err != nil {
		c.t.Fatal(err)
	}
	defer resp.Body.Close()
	var list []envelope.Envelope
	if err := json.NewDecoder(resp.Body).Decode(&list); err != nil {
		c.t.Fatal(err)
	}
	return list
}

// Claim: every frame that the source encrypts arrives at an approved viewer
// and decrypts to exactly the bytes the source had.
func TestEveryFrameDecryptsToExactPlaintext(t *testing.T) {
	c := newChain(t)
	a, b := c.join("viewer-a"), c.join("viewer-b")
	c.approve(a)
	c.approve(b)
	for i := 0; i < 60; i++ {
		au := c.send()
		c.expect(a, viewer.Decrypted, au)
		c.expect(b, viewer.Decrypted, au)
	}
	// epoch 1 had no member; approving a started epoch 2, approving b started epoch 3
	want := viewer.Stats{Received: 60, Decrypted: 60, Epoch: 3}
	if a.Receiver.Stats != want || b.Receiver.Stats != want {
		t.Fatalf("stats a=%+v b=%+v, want %+v", a.Receiver.Stats, b.Receiver.Stats, want)
	}
}

// Claim: nothing that passes through the relay contains the video plaintext
// or any key. The test records every byte the relay receives and sends
// (requests, headers, bodies, responses) over two key epochs.
func TestRelaySeesNeitherPlaintextNorKeys(t *testing.T) {
	c := newChain(t)
	a, b := c.join("viewer-a"), c.join("viewer-b")
	c.approve(a)
	c.approve(b)
	for i := 0; i < 40; i++ {
		au := c.send()
		c.expect(a, viewer.Decrypted, au)
		c.expect(b, viewer.Decrypted, au)
	}
	if err := c.src.Revoke(c.ctx, b.Fingerprint); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 40; i++ {
		au := c.send()
		c.expect(a, viewer.Decrypted, au)
		c.expect(b, viewer.NoKey, nil)
	}
	keys, _, err := a.Envelopes(c.ctx)
	// a was sealed the keys of epoch 2 (its own approval), 3 (b approved) and 4 (b revoked)
	if err != nil || len(keys) != 3 {
		t.Fatalf("viewer a should hold the keys of 3 epochs: %d %v", len(keys), err)
	}
	traffic := c.log.Snapshot()

	// Positive controls: the recording really contains the relayed data.
	for name, needle := range map[string][]byte{
		"last ciphertext frame":  a.LastFrame,
		"viewer public key":      []byte(base64.StdEncoding.EncodeToString(a.PublicKey())),
		"sealed envelope field":  []byte(`"sealed"`),
		"frame upload request":   []byte("POST /v1/streams/" + testStream + "/frames"),
		"envelope fetch request": []byte("/envelopes/" + a.Fingerprint.Hex()),
	} {
		if !bytes.Contains(traffic, needle) {
			t.Fatalf("recording is incomplete: %s not found", name)
		}
	}

	forbidden := map[string][]byte{
		"SPS bytes":              h264.SyntheticSPS,
		"start code + PPS bytes": append([]byte{0, 0, 0, 1}, h264.SyntheticPPS...),
		"plaintext pattern":      h264.SyntheticPattern,
	}
	for i := 0; i < c.sent; i++ {
		au := c.units[i%len(c.units)]
		forbidden["tail of access unit "+strconv.Itoa(i)] = au[len(au)-64:]
	}
	for _, k := range keys {
		e := strconv.FormatUint(k.Epoch, 10)
		sframeKey, sframeSalt, err := sframe.DeriveKeySalt(k.Suite, k.Epoch, k.BaseKey)
		if err != nil {
			t.Fatal(err)
		}
		forbidden["base key of epoch "+e] = k.BaseKey
		forbidden["base key (hex) of epoch "+e] = []byte(hex.EncodeToString(k.BaseKey))
		forbidden["base key (base64) of epoch "+e] = []byte(base64.StdEncoding.EncodeToString(k.BaseKey))
		forbidden["sframe_key of epoch "+e] = sframeKey
		forbidden["sframe_salt of epoch "+e] = sframeSalt
	}
	for name, needle := range forbidden {
		if bytes.Contains(traffic, needle) {
			t.Errorf("the relay saw %s", name)
		}
	}
	t.Logf("relay traffic: %d bytes over %d frames sent in 2 epochs (3 and 4); %d forbidden byte strings searched, none found",
		len(traffic), c.sent, len(forbidden))
}

// Claim: the relay code itself has no access to cryptography: the package
// imports no crypto package and none of this module's key-handling packages.
func TestRelayPackageImportsNoCryptography(t *testing.T) {
	dir := filepath.Join("..", "internal", "relay")
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	checked := 0
	for _, e := range entries {
		if !strings.HasSuffix(e.Name(), ".go") || strings.HasSuffix(e.Name(), "_test.go") {
			continue
		}
		f, err := parser.ParseFile(token.NewFileSet(), filepath.Join(dir, e.Name()), nil, parser.ImportsOnly)
		if err != nil {
			t.Fatal(err)
		}
		for _, imp := range f.Imports {
			path, _ := strconv.Unquote(imp.Path.Value)
			checked++
			for _, bad := range []string{"crypto", "/sframe", "/envelope", "/source", "/viewer", "golang.org/x/crypto"} {
				if strings.HasPrefix(path, bad) || strings.HasSuffix(path, bad) {
					t.Errorf("%s imports %s", e.Name(), path)
				}
			}
		}
	}
	if checked == 0 {
		t.Fatal("no imports checked")
	}
}

// Claim: without the right key a frame does not decrypt; a wrong key (or the
// right key on another stream) fails authentication instead of yielding
// garbage.
func TestWrongKeyFailsAuthentication(t *testing.T) {
	c := newChain(t)
	a, outsider := c.join("approved"), c.join("never approved")
	c.approve(a)
	au := c.send()
	c.expect(a, viewer.Decrypted, au)
	c.expect(outsider, viewer.NoKey, nil)
	if keys, rejected, _ := outsider.Envelopes(c.ctx); len(keys) != 0 || rejected != 0 {
		t.Fatal("an unapproved viewer must not have any envelope")
	}
	frame := a.LastFrame
	const ep = 2 // approving a started epoch 2

	wrongKey := make([]byte, 32)
	rand.Read(wrongKey)
	wrong := viewer.NewReceiver(testStream)
	wrong.AddKey(ep, testSuite, wrongKey)
	if pt, res := wrong.Process(frame); res != viewer.AuthFailure || pt != nil {
		t.Fatalf("wrong key: %v", res)
	}

	keys, _, _ := a.Envelopes(c.ctx)
	otherStream := viewer.NewReceiver("another-stream")
	otherStream.AddKey(ep, testSuite, keys[0].BaseKey)
	if _, res := otherStream.Process(frame); res != viewer.AuthFailure {
		t.Fatalf("right key but another stream: %v", res)
	}
	otherSuite := viewer.NewReceiver(testStream)
	otherSuite.AddKey(ep, sframe.AES128GCMSHA256128, keys[0].BaseKey)
	if _, res := otherSuite.Process(frame); res != viewer.AuthFailure {
		t.Fatalf("right key but another cipher suite: %v", res)
	}

	control := viewer.NewReceiver(testStream)
	control.AddKey(ep, testSuite, keys[0].BaseKey)
	if pt, res := control.Process(frame); res != viewer.Decrypted || !bytes.Equal(pt, au) {
		t.Fatalf("control with the right key: %v", res)
	}
}

// Claim: a frame modified by the relay is rejected, and the stream continues.
func TestTamperedFrameIsRejected(t *testing.T) {
	c := newChain(t)
	a := c.join("viewer")
	c.approve(a)
	for i := 0; i < 5; i++ {
		c.expect(a, viewer.Decrypted, c.send())
	}
	c.relay.AttackTamper(1)
	c.send()
	c.expect(a, viewer.AuthFailure, nil)
	c.expect(a, viewer.Decrypted, c.send())
	want := viewer.Stats{Received: 7, Decrypted: 6, AuthFailures: 1, Epoch: 2}
	if a.Receiver.Stats != want {
		t.Fatalf("stats %+v, want %+v", a.Receiver.Stats, want)
	}
}

// Claim: a genuine frame that the relay sends a second time is rejected.
func TestReplayedFrameIsRejected(t *testing.T) {
	c := newChain(t)
	a := c.join("viewer")
	c.approve(a)
	firstPlain := c.send()
	c.expect(a, viewer.Decrypted, firstPlain)
	firstFrame := bytes.Clone(a.LastFrame)
	for i := 0; i < 4; i++ {
		c.expect(a, viewer.Decrypted, c.send())
	}

	c.relay.AttackReplay(1) // after the next frame the relay resends the first one
	c.expect(a, viewer.Decrypted, c.send())
	c.expect(a, viewer.Replay, nil)
	if !bytes.Equal(a.LastFrame, firstFrame) {
		t.Fatal("the replayed frame should be the unmodified first frame")
	}
	want := viewer.Stats{Received: 7, Decrypted: 6, ReplaysRejected: 1, Epoch: 2}
	if a.Receiver.Stats != want {
		t.Fatalf("stats %+v, want %+v", a.Receiver.Stats, want)
	}

	// The replayed bytes are a valid ciphertext: a receiver that sees them
	// for the first time accepts them, and refuses them the second time.
	keys, _, _ := a.Envelopes(c.ctx)
	fresh := viewer.NewReceiver(testStream)
	fresh.AddKey(keys[0].Epoch, testSuite, keys[0].BaseKey)
	if pt, res := fresh.Process(firstFrame); res != viewer.Decrypted || !bytes.Equal(pt, firstPlain) {
		t.Fatalf("first delivery: %v", res)
	}
	if _, res := fresh.Process(firstFrame); res != viewer.Replay {
		t.Fatalf("second delivery: %v", res)
	}
}

// Claim: if the relay replaces the viewer's public key in the join request
// with its own, the fingerprint the operator sees differs from the one the
// viewer shows; approving the fingerprint reported by the viewer is refused
// and no key leaves the source.
func TestRelaySubstitutingJoinKeyIsCaughtByFingerprint(t *testing.T) {
	c := newChain(t)
	v := c.join("genuine viewer")
	relayKey, _ := envelope.GenerateKey() // the malicious relay's own key pair
	relayFP, _ := envelope.FingerprintOf(relayKey.PublicKey().Bytes())
	c.relay.AttackSubstituteJoinKey(relayKey.PublicKey().Bytes())

	pending, _, _, err := c.src.Lists(c.ctx)
	if err != nil || len(pending) != 1 {
		t.Fatalf("pending: %d %v", len(pending), err)
	}
	if pending[0].Fingerprint != relayFP || pending[0].Fingerprint == v.Fingerprint {
		t.Fatal("the operator should see the relay's fingerprint, which differs from the viewer's")
	}
	if pending[0].Fingerprint.String() == v.Fingerprint.String() {
		t.Fatal("printed fingerprints must differ")
	}
	if err := c.src.Approve(c.ctx, v.Fingerprint); !errors.Is(err, source.ErrUnknownFingerprint) {
		t.Fatalf("approving the fingerprint the viewer reports must be refused, got %v", err)
	}
	if out := c.src.Command(c.ctx, "approve "+v.Fingerprint.String()); !strings.HasPrefix(out, "REFUSED") {
		t.Fatalf("operator command output: %q", out)
	}
	if n := len(rawEnvelopes(c, v.Fingerprint)) + len(rawEnvelopes(c, relayFP)); n != 0 {
		t.Fatalf("%d envelopes were issued", n)
	}
	c.send()
	c.expect(v, viewer.NoKey, nil)
}

// Claim: an envelope sealed to the genuine viewer cannot be opened with the
// relay's key, not even after re-addressing it.
func TestEnvelopeForViewerCannotBeOpenedByRelay(t *testing.T) {
	c := newChain(t)
	v := c.join("genuine viewer")
	c.approve(v)
	relayKey, _ := envelope.GenerateKey()
	relayFP, _ := envelope.FingerprintOf(relayKey.PublicKey().Bytes())

	envs := rawEnvelopes(c, v.Fingerprint)
	if len(envs) != 1 {
		t.Fatalf("expected 1 envelope, got %d", len(envs))
	}
	if _, err := envelope.Open(relayKey, testStream, envs[0]); err == nil {
		t.Fatal("the relay's key opened the viewer's envelope")
	}
	readdressed := envs[0]
	readdressed.To = relayFP.Hex()
	if _, err := envelope.Open(relayKey, testStream, readdressed); err == nil {
		t.Fatal("the relay's key opened a re-addressed envelope")
	}
	c.expect(v, viewer.Decrypted, c.send()) // control: the viewer's own key works
}

// Demonstration of why the comparison is mandatory: an operator who approves
// whatever the list shows, without comparing fingerprints with the viewer,
// hands the key to the relay. Nothing else in the PoC prevents this.
func TestSkippingFingerprintComparisonGivesRelayTheKey(t *testing.T) {
	c := newChain(t)
	v := c.join("genuine viewer")
	relayKey, _ := envelope.GenerateKey()
	relayFP, _ := envelope.FingerprintOf(relayKey.PublicKey().Bytes())
	c.relay.AttackSubstituteJoinKey(relayKey.PublicKey().Bytes())

	pending, _, _, _ := c.src.Lists(c.ctx)
	if err := c.src.Approve(c.ctx, pending[0].Fingerprint); err != nil { // careless approval
		t.Fatal(err)
	}
	envs := rawEnvelopes(c, relayFP)
	if len(envs) != 1 {
		t.Fatalf("expected the envelope to be addressed to the relay's key, got %d", len(envs))
	}
	stolen, err := envelope.Open(relayKey, testStream, envs[0])
	if err != nil {
		t.Fatal(err)
	}
	au := c.send()
	c.expect(v, viewer.NoKey, nil) // the genuine viewer got nothing
	attacker := viewer.NewReceiver(testStream)
	attacker.AddKey(envs[0].Epoch, testSuite, stolen)
	if pt, res := attacker.Process(v.LastFrame); res != viewer.Decrypted || !bytes.Equal(pt, au) {
		t.Fatalf("expected the attack to succeed in this scenario, got %v", res)
	}
	t.Log("as expected: without the out-of-band fingerprint comparison the relay obtains the key")
}

// Claim: a newly approved viewer cannot open anything that was sent before
// its approval. Approval starts a new epoch; the newcomer is sealed only the
// key of that new epoch, never an earlier one. The test lets the newcomer
// record the earlier ciphertext (as a waiting viewer or the relay can) and
// then tries every key it was given on those recorded frames.
func TestNewViewerNeverGetsEarlierEpochKeys(t *testing.T) {
	c := newChain(t)
	a, late := c.join("early viewer"), c.join("late viewer")
	c.approve(a)
	early, _ := c.src.Epoch()
	var recorded [][]byte
	for i := 0; i < 15; i++ {
		au := c.send()
		c.expect(a, viewer.Decrypted, au)
		c.expect(late, viewer.NoKey, nil) // the late viewer is subscribed and sees only ciphertext
		recorded = append(recorded, bytes.Clone(late.LastFrame))
	}
	if keys, rejected, _ := late.Envelopes(c.ctx); len(keys) != 0 || rejected != 0 {
		t.Fatal("a viewer that is not approved yet must not have any envelope")
	}

	c.approve(late)
	now, _ := c.src.Epoch()
	if now != early+1 {
		t.Fatalf("approving a new viewer must start a new epoch: %d -> %d", early, now)
	}
	keys, rejected, err := late.Envelopes(c.ctx)
	if err != nil || rejected != 0 || len(keys) != 1 || keys[0].Epoch != now {
		t.Fatalf("the new viewer must hold exactly the key of the new epoch %d: %+v %v", now, len(keys), err)
	}
	// the earlier viewer keeps working across the change and has both keys
	if aKeys, _, _ := a.Envelopes(c.ctx); len(aKeys) != 2 {
		t.Fatalf("the earlier viewer should hold the keys of epochs %d and %d, has %d", early, now, len(aKeys))
	}
	if bytes.Equal(keys[0].BaseKey, mustKey(t, a, early)) {
		t.Fatal("the new epoch reuses the base key of the earlier epoch")
	}

	// The recorded frames of the earlier epoch stay closed: the receiver has no
	// key for that epoch, and forcing the new key onto the old KID fails.
	meta := envelope.FrameMetadata(testStream)
	for i, frame := range recorded {
		kid, _, _, _ := sframe.DecodeHeader(frame)
		if kid != early {
			t.Fatalf("recorded frame %d carries KID %d, want %d", i, kid, early)
		}
		probe := viewer.NewReceiver(testStream)
		probe.AddKey(keys[0].Epoch, keys[0].Suite, keys[0].BaseKey)
		if pt, res := probe.Process(frame); res == viewer.Decrypted || pt != nil {
			t.Fatalf("recorded frame %d of the earlier epoch was opened by the new viewer", i)
		}
		dec, _ := sframe.NewDecryptor(testSuite, early, keys[0].BaseKey)
		if _, _, err := dec.Decrypt(meta, frame); !errors.Is(err, sframe.ErrAuth) {
			t.Fatalf("new key forced onto the earlier epoch: %v", err)
		}
	}
	// From the new epoch on both viewers decrypt.
	for i := 0; i < 10; i++ {
		au := c.send()
		c.expect(a, viewer.Decrypted, au)
		c.expect(late, viewer.Decrypted, au)
	}
}

// mustKey returns the base key viewer v was sealed for the given epoch.
func mustKey(t *testing.T, v *viewer.Client, epoch uint64) []byte {
	t.Helper()
	keys, _, err := v.Envelopes(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	for _, k := range keys {
		if k.Epoch == epoch {
			return k.BaseKey
		}
	}
	t.Fatalf("viewer has no key for epoch %d", epoch)
	return nil
}

// Claim: revoke starts a new epoch with a fresh key that the revoked viewer
// never receives. It cannot decrypt frames of the new epoch; the remaining
// viewer continues without losing a frame.
func TestRevokeStartsNewEpochWithoutRevokedViewer(t *testing.T) {
	c := newChain(t)
	a, b := c.join("stays"), c.join("gets revoked")
	c.approve(a)
	c.approve(b)
	for i := 0; i < 20; i++ {
		au := c.send()
		c.expect(a, viewer.Decrypted, au)
		c.expect(b, viewer.Decrypted, au)
	}
	oldKeys, _, _ := b.Envelopes(c.ctx)
	// approving a started epoch 2, approving b started epoch 3: b holds only the key of epoch 3
	if len(oldKeys) != 1 || oldKeys[0].Epoch != 3 {
		t.Fatalf("viewer b should hold exactly the epoch 3 key: %+v", len(oldKeys))
	}

	if err := c.src.Revoke(c.ctx, b.Fingerprint); err != nil {
		t.Fatal(err)
	}
	if epoch, _ := c.src.Epoch(); epoch != 4 {
		t.Fatalf("epoch after revoke: %d, want 4", epoch)
	}
	meta := envelope.FrameMetadata(testStream)
	for i := 0; i < 20; i++ {
		au := c.send()
		c.expect(a, viewer.Decrypted, au)
		c.expect(b, viewer.NoKey, nil)
		// The revoked viewer tries its old key on the new frame anyway.
		if kid, _, _, _ := sframe.DecodeHeader(b.LastFrame); kid != 4 {
			t.Fatalf("frame after revoke carries KID %d, want 4", kid)
		}
		dec, _ := sframe.NewDecryptor(testSuite, 4, oldKeys[0].BaseKey)
		if _, _, err := dec.Decrypt(meta, b.LastFrame); !errors.Is(err, sframe.ErrAuth) {
			t.Fatalf("old key on a new-epoch frame: %v", err)
		}
	}
	if want := (viewer.Stats{Received: 40, Decrypted: 40, Epoch: 4}); a.Receiver.Stats != want {
		t.Fatalf("remaining viewer stats %+v, want %+v", a.Receiver.Stats, want)
	}
	if want := (viewer.Stats{Received: 40, Decrypted: 20, NoKey: 20, Epoch: 3}); b.Receiver.Stats != want {
		t.Fatalf("revoked viewer stats %+v, want %+v", b.Receiver.Stats, want)
	}

	// The relay holds three envelopes for a (epochs 2, 3, 4) and still only one for b.
	if keys, _, _ := a.Envelopes(c.ctx); len(keys) != 3 {
		t.Fatalf("remaining viewer has %d keys, want 3", len(keys))
	}
	if keys, _, _ := b.Envelopes(c.ctx); len(keys) != 1 || keys[0].Epoch != 3 {
		t.Fatal("revoked viewer received a key after revocation")
	}
	if err := c.src.Revoke(c.ctx, b.Fingerprint); !errors.Is(err, source.ErrNotMember) {
		t.Fatalf("revoking twice: %v", err)
	}

	// A frame of the old epoch replayed to the remaining viewer is refused.
	c.relay.AttackReplay(1)
	c.expect(a, viewer.Decrypted, c.send())
	c.expect(a, viewer.Replay, nil)
	if kid, _, _, _ := sframe.DecodeHeader(a.LastFrame); kid != 3 {
		t.Fatalf("expected an epoch 3 frame to be replayed, got KID %d", kid)
	}
}

// Known limitation, pinned by a test so that nobody claims otherwise: HPKE
// base mode does not authenticate the sender of an envelope. Whoever knows a
// viewer's public key (the relay does) can seal a key of its own to it and
// then feed that viewer frames of its own making. The relay still cannot
// read the real video, but it can show a viewer false video.
// Remedies are named in README_UZ.md (MLS, or authenticated key delivery).
func TestKnownLimitationEnvelopeSenderIsNotAuthenticated(t *testing.T) {
	c := newChain(t)
	v := c.join("viewer")
	c.approve(v)
	c.expect(v, viewer.Decrypted, c.send())

	attackerKey := bytes.Repeat([]byte{0xEE}, 32)
	env, err := envelope.Seal(v.PublicKey(), testStream, 7, testSuite, attackerKey)
	if err != nil {
		t.Fatal(err)
	}
	body, _ := json.Marshal(env)
	resp, err := http.Post(c.url+"/v1/streams/"+testStream+"/envelopes/"+env.To, "application/json", bytes.NewReader(body))
	if err != nil || resp.StatusCode != http.StatusNoContent {
		t.Fatalf("posting the forged envelope: %v", err)
	}
	resp.Body.Close()

	enc, _ := sframe.NewEncryptor(testSuite, 7, attackerKey)
	fake := []byte("frame that did not come from the real source")
	forged, _, _ := enc.Encrypt(envelope.FrameMetadata(testStream), fake)
	if err := v.FetchKeys(c.ctx); err != nil {
		t.Fatal(err)
	}
	pt, res := v.Receiver.Process(forged)
	if res != viewer.Decrypted || !bytes.Equal(pt, fake) {
		t.Fatalf("this test documents a limitation and expects the forged frame to be accepted; got %v. "+
			"If sender authentication was added, update this test and README_UZ.md.", res)
	}
	t.Log("known limitation confirmed: a forged envelope and frame are accepted (no source authentication in HPKE base mode)")
}
