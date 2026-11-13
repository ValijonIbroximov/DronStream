// Replays a golden interop file through the JavaScript receiver. This is the
// JavaScript twin of checkGolden in ../../e2e/golden_test.go; the file layout
// is described there.

import assert from 'node:assert/strict';

import * as envelope from '../src/envelope.js';
import { Deframer, Receiver } from '../src/receiver.js';
import { importRecipient, readJSON, unhex } from './helpers.mjs';

export async function checkGolden(name) {
  const g = await readJSON(name);
  const keyPair = await importRecipient(g.recipient.sk, g.recipient.pk);
  const fingerprint = await envelope.fingerprintOf(unhex(g.recipient.pk));
  assert.equal(envelope.formatFingerprint(fingerprint), g.recipient.fingerprint);

  const receiver = new Receiver(g.stream);
  let rejected = 0;
  for (const env of g.envelopes) {
    try {
      const { epoch, suite, baseKey } = await envelope.openEnvelope(keyPair, fingerprint, g.stream, env);
      await receiver.addKey(epoch, suite, baseKey);
    } catch {
      rejected++;
    }
  }
  assert.equal(rejected, g.envelopes_rejected, 'number of envelopes that must not open');

  // Feed the byte stream in awkward chunk sizes, as a network would.
  const wire = envelope.fromBase64(g.wire);
  const deframer = new Deframer();
  const frames = [];
  for (let at = 0, size = 1; at < wire.length; at += size, size = (size * 7) % 4099 || 1) {
    frames.push(...deframer.push(wire.subarray(at, at + size)));
  }
  assert.equal(deframer.buffer.length, 0, 'no bytes left over');
  assert.equal(frames.length, g.frames.length, 'number of frames on the wire');

  for (const [i, want] of g.frames.entries()) {
    const outcome = await receiver.process(frames[i]);
    assert.equal(outcome.result, want.expect, `frame ${i} (${want.note})`);
    if (want.expect === 'decrypted') {
      assert.equal(envelope.toBase64(outcome.plaintext), want.plaintext, `frame ${i} plaintext`);
    } else {
      assert.equal(outcome.plaintext, undefined, `frame ${i} must not yield plaintext`);
    }
  }
  const s = receiver.stats;
  assert.deepEqual(
    {
      received: s.received,
      decrypted: s.decrypted,
      auth_failures: s.authFailures,
      replays_rejected: s.replaysRejected,
      no_key: s.noKey,
      epoch: s.epoch,
    },
    g.expected_stats,
  );
  return s;
}
