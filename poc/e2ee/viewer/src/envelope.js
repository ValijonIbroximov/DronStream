// Key delivery: the source seals the SFrame base key of an epoch to this
// viewer's public key with HPKE (RFC 9180), base mode,
// DHKEM(P-256, HKDF-SHA256) + HKDF-SHA256 + AES-256-GCM.
//
// HPKE itself comes from the @hpke/core library (which uses WebCrypto); this
// file only defines the fingerprint format, the HPKE "info" string and the
// envelope checks. It mirrors ../../internal/envelope/envelope.go.
//
// Limitation (see README_UZ.md): base mode does not authenticate the sender.

import { Aes256Gcm, CipherSuite, DhkemP256HkdfSha256, HkdfSha256 } from '@hpke/core';
import { SUITES } from './sframe.js';

export const ENVELOPE_VERSION = 1;
export const PUBLIC_KEY_LENGTH = 65; // uncompressed SEC1 P-256 point: 0x04 || X || Y
const INFO_LABEL = 'DronStream E2EE PoC v1 sframe-base-key';
const GCM_TAG_LENGTH = 16;

const utf8 = (s) => new TextEncoder().encode(s);

export function hpkeSuite() {
  return new CipherSuite({ kem: new DhkemP256HkdfSha256(), kdf: new HkdfSha256(), aead: new Aes256Gcm() });
}

export function toBase64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function fromBase64(text) {
  const s = atob(text); // throws on invalid input
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** SHA-256 over the 65-byte uncompressed public key. */
export async function fingerprintOf(publicKey) {
  if (publicKey.length !== PUBLIC_KEY_LENGTH || publicKey[0] !== 0x04) {
    throw new Error('public key must be a 65-byte uncompressed P-256 point');
  }
  return new Uint8Array(await crypto.subtle.digest('SHA-256', publicKey));
}

/** The full fingerprint for humans: 16 groups of 4 hex digits, as the source prints it. */
export function formatFingerprint(fingerprint) {
  return toHex(fingerprint).match(/.{4}/g).join(' ');
}

/** SFrame metadata (RFC 9605, Section 4.4.3) for every frame of a stream. */
export function frameMetadata(stream) {
  return utf8('DronStream E2EE PoC v1 frame stream=' + stream);
}

/**
 * HPKE info: binds the envelope to stream, epoch, SFrame suite and recipient.
 *   label || 0x00 || uint16(len(stream)) || stream || uint64(epoch) || uint16(suite) || fingerprint(32)
 */
export function info(stream, epoch, suite, fingerprint) {
  const label = utf8(INFO_LABEL);
  const name = utf8(stream);
  const out = new Uint8Array(label.length + 1 + 2 + name.length + 8 + 2 + 32);
  const view = new DataView(out.buffer);
  let at = 0;
  out.set(label, at);
  at += label.length + 1; // the 0x00 separator is already there
  view.setUint16(at, name.length);
  at += 2;
  out.set(name, at);
  at += name.length;
  view.setBigUint64(at, BigInt(epoch));
  at += 8;
  view.setUint16(at, suite);
  at += 2;
  out.set(fingerprint, at);
  return out;
}

/**
 * Generates this viewer's P-256 key pair. The private key is NOT extractable:
 * page script can use it for ECDH but cannot read or export it.
 */
export async function generateViewerKey() {
  const keyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  return { keyPair, publicKey, fingerprint: await fingerprintOf(publicKey) };
}

/**
 * Opens one envelope received from the relay. Every field is untrusted until
 * HPKE has authenticated it through the info parameter. Throws on any problem.
 * @returns {Promise<{epoch: number, suite: number, baseKey: Uint8Array}>}
 */
export async function openEnvelope(keyPair, ownFingerprint, stream, env) {
  if (typeof env !== 'object' || env === null) throw new Error('envelope is not an object');
  if (env.v !== ENVELOPE_VERSION) throw new Error('unsupported envelope version');
  if (env.stream !== stream) throw new Error('envelope is for another stream');
  if (env.to !== toHex(ownFingerprint)) throw new Error('envelope is for another recipient');
  if (!Number.isSafeInteger(env.epoch) || env.epoch < 1) throw new Error('bad epoch');
  if (!Number.isInteger(env.suite) || !Object.hasOwn(SUITES, env.suite)) throw new Error('unsupported SFrame cipher suite');
  if (typeof env.sealed !== 'string' || env.sealed.length > 1024) throw new Error('bad sealed field');
  const sealed = fromBase64(env.sealed);
  if (sealed.length <= PUBLIC_KEY_LENGTH + GCM_TAG_LENGTH) throw new Error('sealed field too short');
  const baseKey = await hpkeSuite().open(
    {
      recipientKey: keyPair,
      enc: sealed.slice(0, PUBLIC_KEY_LENGTH),
      info: info(stream, env.epoch, env.suite, ownFingerprint),
    },
    sealed.slice(PUBLIC_KEY_LENGTH),
  );
  return { epoch: env.epoch, suite: env.suite, baseKey: new Uint8Array(baseKey) };
}

/**
 * Seals a base key to a public key. The browser viewer never does this; it
 * exists for tests and for the JS-to-Go interop fixture.
 */
export async function sealEnvelope(publicKey, stream, epoch, suite, baseKey) {
  const fingerprint = await fingerprintOf(publicKey);
  const hpke = hpkeSuite();
  const recipientPublicKey = await hpke.kem.deserializePublicKey(publicKey.slice().buffer);
  const { enc, ct } = await hpke.seal({ recipientPublicKey, info: info(stream, epoch, suite, fingerprint) }, baseKey);
  const sealed = new Uint8Array(enc.byteLength + ct.byteLength);
  sealed.set(new Uint8Array(enc));
  sealed.set(new Uint8Array(ct), enc.byteLength);
  return { v: ENVELOPE_VERSION, stream, epoch, suite, to: toHex(fingerprint), sealed: toBase64(sealed) };
}
