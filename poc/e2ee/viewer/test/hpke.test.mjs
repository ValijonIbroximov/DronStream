// HPKE key delivery on the JavaScript side: the @hpke/core library against
// the RFC 9180 known-answer values, and our envelope format on top of it.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Aes128Gcm, CipherSuite, DhkemP256HkdfSha256, HkdfSha256 } from '@hpke/core';
import * as envelope from '../src/envelope.js';
import { hex, importRecipient, readJSON, unhex } from './helpers.mjs';

const rfc = await readJSON('rfc9180-a3-base.json');

// Same KEM and KDF as the envelope; the RFC vector's AEAD is AES-128-GCM
// (RFC 9180 has no P-256 vector with AES-256-GCM).
test('RFC 9180 Appendix A.3.1 known answers (DHKEM(P-256), HKDF-SHA256, AES-128-GCM, base mode)', async () => {
  const suite = new CipherSuite({ kem: new DhkemP256HkdfSha256(), kdf: new HkdfSha256(), aead: new Aes128Gcm() });
  const recipientKey = await importRecipient(rfc.skRm, rfc.pkRm);
  const context = await suite.createRecipientContext({ recipientKey, enc: unhex(rfc.enc), info: unhex(rfc.info) });
  assert.equal(rfc.encryptions.length, 3);
  for (const [i, e] of rfc.encryptions.entries()) {
    assert.equal(e.seq, i);
    assert.equal(hex(new Uint8Array(await context.open(unhex(e.ct), unhex(e.aad)))), e.pt);
  }
});

test('viewer key: private key is not extractable, fingerprint is SHA-256 of the public key', async () => {
  const key = await envelope.generateViewerKey();
  assert.equal(key.keyPair.privateKey.extractable, false);
  await assert.rejects(crypto.subtle.exportKey('pkcs8', key.keyPair.privateKey));
  await assert.rejects(crypto.subtle.exportKey('jwk', key.keyPair.privateKey));
  assert.equal(key.publicKey.length, 65);
  assert.equal(key.publicKey[0], 0x04);
  const expected = new Uint8Array(await crypto.subtle.digest('SHA-256', key.publicKey));
  assert.deepEqual(key.fingerprint, expected);
  assert.match(envelope.formatFingerprint(key.fingerprint), /^([0-9a-f]{4} ){15}[0-9a-f]{4}$/);
});

test('fingerprint text is identical to what the Go source prints', async () => {
  // The Go side wrote the fingerprint of the RFC example key into its golden file.
  const golden = await readJSON('golden/go-to-js.json');
  const fingerprint = await envelope.fingerprintOf(unhex(golden.recipient.pk));
  assert.equal(envelope.formatFingerprint(fingerprint), golden.recipient.fingerprint);
});

test('envelope: seal/open with a non-extractable key; every field is bound', async () => {
  const key = await envelope.generateViewerKey();
  const baseKey = crypto.getRandomValues(new Uint8Array(32));
  const env = await envelope.sealEnvelope(key.publicKey, 's1', 3, 5, baseKey);
  const opened = await envelope.openEnvelope(key.keyPair, key.fingerprint, 's1', env);
  assert.deepEqual(opened, { epoch: 3, suite: 5, baseKey });

  const mutations = {
    epoch: { epoch: 4 },
    suite: { suite: 4 },
    stream: { stream: 's2' },
    to: { to: '0'.repeat(64) },
    version: { v: 2 },
    'unknown suite': { suite: 1 },
    'epoch zero': { epoch: 0 },
    'sealed truncated': { sealed: env.sealed.slice(0, 40) },
    'sealed not base64': { sealed: '***' },
  };
  for (const [name, change] of Object.entries(mutations)) {
    await assert.rejects(envelope.openEnvelope(key.keyPair, key.fingerprint, 's1', { ...env, ...change }), `modified ${name}`);
  }
  await assert.rejects(envelope.openEnvelope(key.keyPair, key.fingerprint, 's2', env), 'another stream');
  await assert.rejects(envelope.openEnvelope(key.keyPair, key.fingerprint, 's1', null), 'not an object');

  // Another key cannot open it, even if the address is rewritten to match.
  const other = await envelope.generateViewerKey();
  await assert.rejects(envelope.openEnvelope(other.keyPair, other.fingerprint, 's1', env));
  const readdressed = { ...env, to: envelope.toHex(other.fingerprint) };
  await assert.rejects(envelope.openEnvelope(other.keyPair, other.fingerprint, 's1', readdressed));
});
