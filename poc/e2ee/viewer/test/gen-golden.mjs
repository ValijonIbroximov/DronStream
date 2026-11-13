// Writes testdata/golden/js-to-go.json: HPKE envelopes sealed with @hpke/core
// and SFrame frames encrypted by ../src/sframe.js, for the Go test
// TestGoldenJSToGo (and for golden.test.mjs). Same scenario and layout as the
// Go-written fixture (see ../../e2e/golden_test.go), but with SFrame cipher
// suite 4 so that both suites cross the language boundary.
//
//   node viewer/test/gen-golden.mjs      (or: npm run golden)
//
// Nothing here is secret: the recipient is the public example key pair of
// RFC 9180 Appendix A.3.1 and the base keys are fixed patterns. The HPKE
// ephemeral key is random, so every run produces different "sealed" fields.

import { mkdir, writeFile } from 'node:fs/promises';

import * as envelope from '../src/envelope.js';
import * as sframe from '../src/sframe.js';
import { readJSON, testdata, unhex } from './helpers.mjs';

const STREAM = 'golden-js';
const SUITE = 4;

const rfc = await readJSON('rfc9180-a3-base.json');
const publicKey = unhex(rfc.pkRm);
const fingerprint = await envelope.fingerprintOf(publicKey);
const patternKey = (first) => Uint8Array.from({ length: 32 }, (_, i) => first + i);
const baseKeys = { 1: patternKey(0x00), 2: patternKey(0x20), 3: patternKey(0x40) };

const envelopes = [
  await envelope.sealEnvelope(publicKey, STREAM, 1, SUITE, baseKeys[1]),
  await envelope.sealEnvelope(publicKey, STREAM, 2, SUITE, baseKeys[2]),
];
envelopes.push({ ...envelopes[1], epoch: 3 }); // epoch 2 envelope re-labelled as epoch 3: must not open

const metadata = envelope.frameMetadata(STREAM);
const keys = {};
const counters = { 1: 0n, 2: 0n, 3: 0n };
for (const epoch of [1, 2, 3]) keys[epoch] = await sframe.newKey(SUITE, epoch, baseKeys[epoch], 'encrypt');
const seal = (epoch, plaintext) => sframe.encrypt(keys[epoch], counters[epoch]++, metadata, plaintext);

// Plaintexts shaped like tiny Annex-B access units.
const unit = (i) =>
  sframe.concat(Uint8Array.of(0, 0, 0, 1, i % 4 === 0 ? 0x65 : 0x41, 0x88), new TextEncoder().encode(`js-plaintext-frame-${i}-` + 'x'.repeat(40 + i * 13)));

const sent = [];
const frames = [];
const add = (frame, expect, plaintext, note) => {
  sent.push(frame);
  frames.push(expect === 'decrypted' ? { expect, plaintext: envelope.toBase64(plaintext), note } : { expect, note });
};

for (let i = 0; i < 6; i++) add(await seal(1, unit(i)), 'decrypted', unit(i), 'epoch 1');
const tampered = await seal(1, unit(6));
tampered[tampered.length >> 1] ^= 0x01;
add(tampered, 'auth-failure', null, 'epoch 1, one bit flipped in transit');
add(await seal(1, unit(7)), 'decrypted', unit(7), 'epoch 1, stream continues after the bad frame');
add(sent[2], 'replay-rejected', null, 'third frame sent again');
for (let i = 8; i < 11; i++) add(await seal(2, unit(i)), 'decrypted', unit(i), 'epoch 2 (key change)');
add(sent[7], 'replay-rejected', null, 'frame of the old epoch 1 sent again');
add(await seal(3, unit(11)), 'no-key', null, 'epoch 3: only a re-labelled envelope exists, which must not open');
add(await seal(2, unit(0)), 'decrypted', unit(0), 'epoch 2 continues');

const lengthPrefixed = sent.map((frame) => {
  const out = new Uint8Array(4 + frame.length);
  new DataView(out.buffer).setUint32(0, frame.length);
  out.set(frame, 4);
  return out;
});

const golden = {
  about:
    'JS to Go interop fixture: HPKE envelopes sealed by @hpke/core and SFrame frames encrypted by viewer/src/sframe.js. ' +
    'Regenerate with: node viewer/test/gen-golden.mjs',
  stream: STREAM,
  recipient: {
    source: 'RFC 9180 Appendix A.3.1 example key pair (public test vector, not a secret)',
    sk: rfc.skRm,
    pk: rfc.pkRm,
    fingerprint: envelope.formatFingerprint(fingerprint),
  },
  envelopes,
  envelopes_rejected: 1,
  wire: envelope.toBase64(sframe.concat(...lengthPrefixed)),
  frames,
  expected_stats: { received: 15, decrypted: 11, auth_failures: 1, replays_rejected: 2, no_key: 1, epoch: 2 },
};

await mkdir(testdata('golden/'), { recursive: true });
await writeFile(testdata('golden/js-to-go.json'), JSON.stringify(golden, null, 2) + '\n');
console.log('wrote testdata/golden/js-to-go.json');
