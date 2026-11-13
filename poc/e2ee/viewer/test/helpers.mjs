// Shared helpers for the Node tests (node --test). Node 22 provides WebCrypto
// as globalThis.crypto, the same API the browser code uses.

import { readFile } from 'node:fs/promises';
import { DhkemP256HkdfSha256 } from '@hpke/core';

export const testdata = (name) => new URL('../../testdata/' + name, import.meta.url);

export const hex = (bytes) => Buffer.from(bytes).toString('hex');
export const unhex = (text) => new Uint8Array(Buffer.from(text, 'hex'));

export async function readJSON(name) {
  return JSON.parse(await readFile(testdata(name), 'utf8'));
}

/**
 * The RFC 9605 vectors contain 64-bit kid/ctr values that do not fit a
 * JavaScript number, so those two fields are turned into BigInt.
 */
export async function readSFrameVectors() {
  const text = await readFile(testdata('rfc9605-test-vectors.json'), 'utf8');
  const quoted = text.replace(/"(kid|ctr)":\s*(\d+)/g, '"$1": "$2"');
  return JSON.parse(quoted, (name, value) => (name === 'kid' || name === 'ctr' ? BigInt(value) : value));
}

/**
 * Imports the public example key pair of RFC 9180 Appendix A.3.1 as a
 * CryptoKeyPair (the recipient key of the golden interop files).
 */
export async function importRecipient(skHex, pkHex) {
  const kem = new DhkemP256HkdfSha256();
  return {
    privateKey: await kem.importKey('raw', unhex(skHex).buffer, false),
    publicKey: await kem.importKey('raw', unhex(pkHex).buffer, true),
  };
}
