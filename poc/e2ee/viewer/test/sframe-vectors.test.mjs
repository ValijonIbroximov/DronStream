// The JavaScript SFrame code against the official RFC 9605 test vectors
// (testdata/rfc9605-test-vectors.json, see testdata/SOURCES.txt).

import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as sframe from '../src/sframe.js';
import { hex, readSFrameVectors, unhex } from './helpers.mjs';

const vectors = await readSFrameVectors();

test('RFC 9605 header vectors: encode and decode all 289', () => {
  assert.equal(vectors.header.length, 289);
  for (const v of vectors.header) {
    assert.equal(hex(sframe.encodeHeader(v.kid, v.ctr)), v.encoded, `encode kid=${v.kid} ctr=${v.ctr}`);
    const decoded = sframe.decodeHeader(unhex(v.encoded));
    assert.equal(decoded.kid, v.kid);
    assert.equal(decoded.ctr, v.ctr);
    assert.equal(decoded.length, v.encoded.length / 2);
  }
});

// sframe_secret is an intermediate value inside WebCrypto's HKDF. To check it
// against the vectors as well, compute HKDF-Extract("", base_key) by hand:
// HMAC(key = HashLen zero bytes, message = base_key).
async function extractSecret(hash, baseKey) {
  const zeros = new Uint8Array(hash === 'SHA-512' ? 64 : 32);
  const key = await crypto.subtle.importKey('raw', zeros, { name: 'HMAC', hash }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, baseKey));
}

test('RFC 9605 SFrame vectors: key derivation, encrypt, decrypt (AES-GCM suites 4 and 5)', async () => {
  let ran = 0;
  let skipped = 0;
  for (const v of vectors.sframe) {
    const suite = sframe.SUITES[v.cipher_suite];
    if (!suite) {
      skipped++; // AES-CTR-HMAC suites 1..3 are not implemented in this PoC
      continue;
    }
    ran++;
    const baseKey = unhex(v.base_key);
    const metadata = unhex(v.metadata);

    assert.equal(hex(sframe.label('key', v.kid, suite.id)), v.sframe_key_label);
    assert.equal(hex(sframe.label('salt', v.kid, suite.id)), v.sframe_salt_label);
    assert.equal(hex(await extractSecret(suite.hash, baseKey)), v.sframe_secret);
    const { key, salt } = await sframe.deriveKeySalt(suite.id, v.kid, baseKey);
    assert.equal(hex(key), v.sframe_key);
    assert.equal(hex(salt), v.sframe_salt);
    assert.equal(hex(sframe.nonce(salt, v.ctr)), v.nonce);
    assert.equal(hex(sframe.concat(sframe.encodeHeader(v.kid, v.ctr), metadata)), v.aad);

    const encKey = await sframe.newKey(suite.id, v.kid, baseKey, 'encrypt');
    assert.equal(hex(await sframe.encrypt(encKey, v.ctr, metadata, unhex(v.pt))), v.ct);

    const decKey = await sframe.newKey(suite.id, v.kid, baseKey, 'decrypt');
    const { plaintext, ctr } = await sframe.decrypt(decKey, metadata, unhex(v.ct));
    assert.equal(hex(plaintext), v.pt);
    assert.equal(ctr, v.ctr);
  }
  assert.equal(ran, 2, 'both AES-GCM vectors must run');
  assert.equal(skipped, 3, 'the three AES-CTR-HMAC vectors are skipped');
});

test('malformed and non-minimal headers are rejected', () => {
  for (const bad of ['', '08', '99012345', '0807', '090001', '8005']) {
    assert.throws(() => sframe.decodeHeader(unhex(bad)), (e) => e.code === 'header', `header "${bad}"`);
  }
  assert.throws(() => sframe.encodeHeader(-1n, 0n), (e) => e.code === 'range');
  assert.throws(() => sframe.encodeHeader(0n, 1n << 64n), (e) => e.code === 'range');
});

test('any bit flip, wrong metadata, wrong key, wrong KID and truncation fail', async () => {
  const baseKey = new Uint8Array(32).fill(0x42);
  const metadata = new TextEncoder().encode('stream-A');
  for (const suite of [4, 5]) {
    const enc = await sframe.newKey(suite, 9n, baseKey, 'encrypt');
    const dec = await sframe.newKey(suite, 9n, baseKey, 'decrypt');
    const plaintext = new Uint8Array(100).fill(7);
    const ciphertext = await sframe.encrypt(enc, 300n, metadata, plaintext);
    assert.deepEqual((await sframe.decrypt(dec, metadata, ciphertext)).plaintext, plaintext);

    for (let i = 0; i < ciphertext.length; i++) {
      const bad = ciphertext.slice();
      bad[i] ^= 0x01;
      await assert.rejects(sframe.decrypt(dec, metadata, bad), `bit flip at byte ${i}`);
    }
    await assert.rejects(sframe.decrypt(dec, new TextEncoder().encode('stream-B'), ciphertext), (e) => e.code === 'auth');
    const otherKey = await sframe.newKey(suite, 9n, new Uint8Array(32).fill(0x43), 'decrypt');
    await assert.rejects(sframe.decrypt(otherKey, metadata, ciphertext), (e) => e.code === 'auth');
    const otherKid = await sframe.newKey(suite, 10n, baseKey, 'decrypt');
    await assert.rejects(sframe.decrypt(otherKid, metadata, ciphertext), (e) => e.code === 'kid');
    await assert.rejects(sframe.decrypt(dec, metadata, ciphertext.slice(0, -1)), (e) => e.code === 'auth');

    // A key is for one direction only, enforced by WebCrypto key usages.
    await assert.rejects(sframe.decrypt(enc, metadata, ciphertext));
    await assert.rejects(sframe.encrypt(dec, 301n, metadata, plaintext));
  }
  await assert.rejects(sframe.newKey(1, 0n, baseKey, 'decrypt'), (e) => e.code === 'suite');
});
