// Receive rules, stream framing and the small H.264 helpers of the viewer.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { frameMetadata } from '../src/envelope.js';
import { codecFromKeyframe, isKeyframe } from '../src/h264.js';
import { Deframer, MAX_FRAME, peekEpoch, Receiver } from '../src/receiver.js';
import * as sframe from '../src/sframe.js';

const STREAM = 'unit';
const baseKey = (n) => new Uint8Array(32).fill(n);

async function sender(epoch, key, suite = 5) {
  const k = await sframe.newKey(suite, epoch, key, 'encrypt');
  let ctr = 0n;
  return (plaintext) => sframe.encrypt(k, ctr++, frameMetadata(STREAM), plaintext);
}

test('replays are rejected and counters only move on authenticated frames', async () => {
  const send = await sender(1, baseKey(1));
  const r = new Receiver(STREAM);
  await r.addKey(1, 5, baseKey(1));
  const f0 = await send(Uint8Array.of(0));
  const f1 = await send(Uint8Array.of(1));
  const f2 = await send(Uint8Array.of(2));

  assert.equal((await r.process(f0)).result, 'decrypted');
  assert.equal((await r.process(f0)).result, 'replay-rejected');
  assert.equal((await r.process(f2)).result, 'decrypted');
  assert.equal((await r.process(f1)).result, 'replay-rejected', 'older counter after a newer one');

  // A forged frame claiming a huge counter must not block the real stream.
  const forged = sframe.concat(sframe.encodeHeader(1n, 1000000n), new Uint8Array(40));
  assert.equal((await r.process(forged)).result, 'auth-failure');
  const f3 = await send(Uint8Array.of(3));
  assert.deepEqual((await r.process(f3)).plaintext, Uint8Array.of(3));
  assert.deepEqual(r.stats, { received: 6, decrypted: 3, authFailures: 1, replaysRejected: 2, noKey: 0, epoch: 1 });
});

test('epoch change: new key is used, old epoch is refused afterwards, unknown epoch has no key', async () => {
  const send1 = await sender(1, baseKey(1));
  const send2 = await sender(2, baseKey(2));
  const r = new Receiver(STREAM);
  await r.addKey(1, 5, baseKey(1));

  const old = await send1(Uint8Array.of(1));
  assert.equal((await r.process(old)).result, 'decrypted');
  const next = await send2(Uint8Array.of(2));
  assert.deepEqual(await r.process(next), { result: 'no-key', epoch: 2 }, 'revoked viewer: no key for epoch 2');
  assert.equal(peekEpoch(next), 2);

  await r.addKey(2, 5, baseKey(2));
  assert.equal((await r.process(await send2(Uint8Array.of(3)))).result, 'decrypted');
  assert.equal(r.stats.epoch, 2);
  assert.equal(r.hasKey(1), false, 'the old key is dropped');
  assert.equal((await r.process(await send1(Uint8Array.of(4)))).result, 'replay-rejected', 'old epoch after the switch');
  assert.equal(await r.addKey(1, 5, baseKey(1)), false, 'a key for a past epoch is ignored');

  // The old key does not open frames of the new epoch.
  const stale = new Receiver(STREAM);
  await stale.addKey(2, 5, baseKey(1));
  assert.equal((await stale.process(await send2(Uint8Array.of(5)))).result, 'auth-failure');

  // Garbage and absurd KIDs.
  assert.equal((await r.process(new Uint8Array(0))).result, 'auth-failure');
  assert.equal((await r.process(sframe.encodeHeader((1n << 64n) - 1n, 0n))).result, 'no-key');
  assert.equal(peekEpoch(new Uint8Array(0)), null);
});

test('Deframer splits the byte stream at any chunk boundary and bounds frame size', () => {
  const frame = (n) => {
    const out = new Uint8Array(4 + n).fill(n);
    new DataView(out.buffer).setUint32(0, n);
    return out;
  };
  const wire = sframe.concat(frame(0), frame(1), frame(300), frame(5));
  for (const chunk of [1, 2, 3, 4, 5, 7, 64, wire.length]) {
    const d = new Deframer();
    const lengths = [];
    for (let at = 0; at < wire.length; at += chunk) {
      for (const f of d.push(wire.subarray(at, at + chunk))) lengths.push(f.length);
    }
    assert.deepEqual(lengths, [0, 1, 300, 5], `chunk size ${chunk}`);
    assert.equal(d.buffer.length, 0);
  }
  const tooLarge = new Uint8Array(4);
  new DataView(tooLarge.buffer).setUint32(0, MAX_FRAME + 1);
  assert.throws(() => new Deframer().push(tooLarge));
});

test('H.264 helpers: key frame detection and codec string from the SPS', () => {
  const keyframe = Uint8Array.of(0, 0, 0, 1, 0x67, 0x42, 0xc0, 0x1e, 0xd9, 0, 0, 0, 1, 0x68, 0xce, 0x3c, 0x80, 0, 0, 1, 0x65, 0x88, 1, 2);
  const delta = Uint8Array.of(0, 0, 0, 1, 0x41, 0x9a, 1, 2, 3);
  assert.equal(isKeyframe(keyframe), true);
  assert.equal(isKeyframe(delta), false);
  assert.equal(codecFromKeyframe(keyframe), 'avc1.42c01e');
  assert.equal(codecFromKeyframe(delta), null);
  assert.equal(isKeyframe(new Uint8Array(0)), false);
});
