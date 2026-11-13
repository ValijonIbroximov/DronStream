// SFrame (RFC 9605) with the two AES-GCM cipher suites, on top of WebCrypto.
//
// This file mirrors ../../sframe/sframe.go line for line in behaviour; both
// are verified against the official RFC 9605 test vectors. Section numbers
// refer to RFC 9605. KID and CTR are 64-bit values and therefore BigInt.
//
// Replay protection is not part of SFrame (Section 9.3); see receiver.js.

export const SUITES = Object.freeze({
  4: Object.freeze({ id: 4, name: 'AES_128_GCM_SHA256_128', hash: 'SHA-256', nk: 16, nn: 12, nt: 16 }),
  5: Object.freeze({ id: 5, name: 'AES_256_GCM_SHA512_128', hash: 'SHA-512', nk: 32, nn: 12, nt: 16 }),
});

const MAX_U64 = (1n << 64n) - 1n;

/** Error with a machine-readable code: 'suite' | 'header' | 'kid' | 'auth' | 'range'. */
export class SFrameError extends Error {
  constructor(code, message) {
    super('sframe: ' + message);
    this.code = code;
  }
}

function suiteParams(suiteId) {
  const s = SUITES[suiteId];
  if (!s) throw new SFrameError('suite', 'unsupported cipher suite ' + suiteId);
  return s;
}

function u64(value, what) {
  const v = BigInt(value);
  if (v < 0n || v > MAX_U64) throw new SFrameError('range', what + ' out of range');
  return v;
}

export function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

// ---- Header (Section 4.3) ---------------------------------------------------
//
//    0 1 2 3 4 5 6 7
//   +-+-+-+-+-+-+-+-+------------+------------+
//   |X|  K  |Y|  C  |   KID...   |   CTR...   |
//   +-+-+-+-+-+-+-+-+------------+------------+
//
// A value in 0..7 is carried in the 3-bit field (flag 0). Otherwise the flag
// is 1, the field holds (length-1) and the value follows as a minimal-length
// big-endian integer, KID first, CTR second.

function minimalBE(v) {
  const bytes = [];
  for (; v > 0n; v >>= 8n) bytes.unshift(Number(v & 0xffn));
  return bytes;
}

export function encodeHeader(kid, ctr) {
  kid = u64(kid, 'KID');
  ctr = u64(ctr, 'CTR');
  let config = 0;
  const rest = [];
  if (kid < 8n) {
    config |= Number(kid) << 4;
  } else {
    const b = minimalBE(kid);
    config |= 0x80 | ((b.length - 1) << 4);
    rest.push(...b);
  }
  if (ctr < 8n) {
    config |= Number(ctr);
  } else {
    const b = minimalBE(ctr);
    config |= 0x08 | (b.length - 1);
    rest.push(...b);
  }
  return Uint8Array.of(config, ...rest);
}

/**
 * Parses the header at the start of `bytes`.
 * Encodings that are not minimal are rejected: a conforming sender never
 * produces them.
 * @returns {{kid: bigint, ctr: bigint, length: number}}
 */
export function decodeHeader(bytes) {
  if (bytes.length < 1) throw new SFrameError('header', 'empty ciphertext');
  const config = bytes[0];
  let n = 1;
  const field = (extended, bits) => {
    if (!extended) return BigInt(bits);
    const length = bits + 1;
    if (bytes.length < n + length) throw new SFrameError('header', 'truncated header');
    let v = 0n;
    for (let i = n; i < n + length; i++) v = (v << 8n) | BigInt(bytes[i]);
    if (v < 8n || bytes[n] === 0) throw new SFrameError('header', 'header value is not minimally encoded');
    n += length;
    return v;
  };
  const kid = field((config & 0x80) !== 0, (config >> 4) & 0x07);
  const ctr = field((config & 0x08) !== 0, config & 0x07);
  return { kid, ctr, length: n };
}

// ---- Key derivation (Section 4.4.2) -----------------------------------------
//
//   sframe_secret     = HKDF-Extract("", base_key)
//   sframe_key_label  = "SFrame 1.0 Secret key "  + KID(8 bytes BE) + cipher_suite(2 bytes BE)
//   sframe_key        = HKDF-Expand(sframe_secret, sframe_key_label, AEAD.Nk)
//   sframe_salt_label = "SFrame 1.0 Secret salt " + KID(8 bytes BE) + cipher_suite(2 bytes BE)
//   sframe_salt       = HKDF-Expand(sframe_secret, sframe_salt_label, AEAD.Nn)

/** @param {'key'|'salt'} kind */
export function label(kind, kid, suiteId) {
  const prefix = new TextEncoder().encode('SFrame 1.0 Secret ' + kind + ' ');
  const out = new Uint8Array(prefix.length + 10);
  out.set(prefix);
  const view = new DataView(out.buffer);
  view.setBigUint64(prefix.length, u64(kid, 'KID'));
  view.setUint16(prefix.length + 8, suiteId);
  return out;
}

/** Derives the raw sframe_key and sframe_salt (used directly only by tests). */
export async function deriveKeySalt(suiteId, kid, baseKey) {
  const s = suiteParams(suiteId);
  if (baseKey.length === 0) throw new SFrameError('range', 'empty base key');
  const ikm = await crypto.subtle.importKey('raw', baseKey, 'HKDF', false, ['deriveBits']);
  // WebCrypto HKDF is Extract-then-Expand. With an empty salt its Extract
  // step is exactly HKDF-Extract("", base_key) of the RFC.
  const expand = async (kind, length) =>
    new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: s.hash, salt: new Uint8Array(0), info: label(kind, kid, suiteId) },
        ikm,
        length * 8,
      ),
    );
  return { key: await expand('key', s.nk), salt: await expand('salt', s.nn) };
}

// ---- Encryption / decryption (Sections 4.4.3 and 4.4.4) ---------------------

/**
 * Derives the key material of one KID. `usage` is 'encrypt' or 'decrypt':
 * a base key is used for one direction only (Section 4.4.1), and WebCrypto
 * enforces it because the AES key is imported with that single usage. The
 * AES key is not extractable.
 */
export async function newKey(suiteId, kid, baseKey, usage) {
  if (usage !== 'encrypt' && usage !== 'decrypt') throw new SFrameError('range', 'usage must be encrypt or decrypt');
  const { key, salt } = await deriveKeySalt(suiteId, kid, baseKey);
  const aesKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, [usage]);
  key.fill(0);
  return { suite: suiteId, kid: u64(kid, 'KID'), aesKey, salt, tagLength: suiteParams(suiteId).nt * 8 };
}

/** nonce = sframe_salt XOR encode_big_endian(CTR, AEAD.Nn) */
export function nonce(salt, ctr) {
  const n = new Uint8Array(salt.length);
  new DataView(n.buffer).setBigUint64(n.length - 8, u64(ctr, 'CTR'));
  for (let i = 0; i < n.length; i++) n[i] ^= salt[i];
  return n;
}

/**
 * header || AEAD.Encrypt(sframe_key, nonce, header || metadata, plaintext).
 * The caller must never reuse a CTR with the same key (Section 9.1). The
 * browser viewer never encrypts; this exists for the test vectors and the
 * JS-to-Go interop fixture.
 */
export async function encrypt(k, ctr, metadata, plaintext) {
  const header = encodeHeader(k.kid, ctr);
  const body = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce(k.salt, ctr), additionalData: concat(header, metadata), tagLength: k.tagLength },
    k.aesKey,
    plaintext,
  );
  return concat(header, new Uint8Array(body));
}

/**
 * Authenticates and decrypts one SFrame ciphertext.
 * Throws SFrameError ('header', 'kid' or 'auth'). Does not check for replays.
 * @returns {Promise<{plaintext: Uint8Array, ctr: bigint}>}
 */
export async function decrypt(k, metadata, ciphertext) {
  const { kid, ctr, length } = decodeHeader(ciphertext);
  if (kid !== k.kid) throw new SFrameError('kid', 'ciphertext KID does not match this key');
  const aad = concat(ciphertext.subarray(0, length), metadata);
  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce(k.salt, ctr), additionalData: aad, tagLength: k.tagLength },
      k.aesKey,
      ciphertext.subarray(length),
    );
  } catch {
    throw new SFrameError('auth', 'authentication failed');
  }
  return { plaintext: new Uint8Array(plaintext), ctr };
}
