// Receive rules of the viewer. Mirrors ../../internal/viewer/receiver.go.
//
// SFrame leaves two things to the application (RFC 9605, Sections 9.1, 9.3):
//   - within one KID the counter must be strictly higher than the last
//     accepted one (the transport is an ordered byte stream, so no reordering
//     window is needed); anything else is a replay
//   - epochs only move forward: once a frame of epoch N was accepted, frames
//     and keys of older epochs are refused and their keys are dropped
//
// The SFrame KID is the key epoch number.

import { frameMetadata } from './envelope.js';
import * as sframe from './sframe.js';

export const MAX_FRAME = 4 << 20; // same bound as internal/wire

/** Splits the relay's byte stream (uint32 big-endian length + frame) into frames. */
export class Deframer {
  constructor() {
    this.buffer = new Uint8Array(0);
  }

  /** @param {Uint8Array} chunk  @returns {Uint8Array[]} complete frames */
  push(chunk) {
    this.buffer = sframe.concat(this.buffer, chunk);
    const frames = [];
    for (;;) {
      if (this.buffer.length < 4) break;
      const length = new DataView(this.buffer.buffer, this.buffer.byteOffset).getUint32(0);
      if (length > MAX_FRAME) throw new Error('frame larger than 4 MiB');
      if (this.buffer.length < 4 + length) break;
      frames.push(this.buffer.slice(4, 4 + length));
      this.buffer = this.buffer.subarray(4 + length);
    }
    return frames;
  }
}

/** Epoch (KID) named in a frame header, or null if unreadable or absurdly large. */
export function peekEpoch(frame) {
  try {
    const { kid } = sframe.decodeHeader(frame);
    return kid <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(kid) : null;
  } catch {
    return null;
  }
}

export class Receiver {
  constructor(stream) {
    this.metadata = frameMetadata(stream);
    this.keys = new Map(); // epoch -> SFrame decryption key
    this.last = new Map(); // epoch -> highest accepted CTR (BigInt)
    this.stats = { received: 0, decrypted: 0, authFailures: 0, replaysRejected: 0, noKey: 0, epoch: 0 };
  }

  hasKey(epoch) {
    return this.keys.has(epoch);
  }

  /** Installs the base key of an epoch; stale or duplicate epochs are ignored. */
  async addKey(epoch, suite, baseKey) {
    if (epoch < this.stats.epoch || this.keys.has(epoch)) return false;
    const key = await sframe.newKey(suite, epoch, baseKey, 'decrypt');
    if (this.keys.has(epoch)) return false;
    this.keys.set(epoch, key);
    return true;
  }

  /**
   * Handles one SFrame ciphertext. Frames must be processed one at a time, in
   * arrival order (await each call).
   * @returns {Promise<{result: 'decrypted'|'auth-failure'|'replay-rejected'|'no-key', plaintext?: Uint8Array, epoch?: number}>}
   */
  async process(frame) {
    const stats = this.stats;
    stats.received++;
    let header;
    try {
      header = sframe.decodeHeader(frame);
    } catch {
      stats.authFailures++;
      return { result: 'auth-failure' };
    }
    if (header.kid > BigInt(Number.MAX_SAFE_INTEGER)) {
      stats.noKey++; // no envelope can name such an epoch
      return { result: 'no-key' };
    }
    const epoch = Number(header.kid);
    const ctr = header.ctr;
    if (epoch < stats.epoch) {
      stats.replaysRejected++;
      return { result: 'replay-rejected', epoch };
    }
    const key = this.keys.get(epoch);
    if (!key) {
      stats.noKey++;
      return { result: 'no-key', epoch };
    }
    if (this.last.has(epoch) && ctr <= this.last.get(epoch)) {
      stats.replaysRejected++;
      return { result: 'replay-rejected', epoch };
    }
    let plaintext;
    try {
      ({ plaintext } = await sframe.decrypt(key, this.metadata, frame));
    } catch {
      stats.authFailures++;
      return { result: 'auth-failure', epoch };
    }
    // Only an authenticated frame may move the replay counter or the epoch.
    this.last.set(epoch, ctr);
    if (epoch > stats.epoch) {
      stats.epoch = epoch;
      for (const old of [...this.keys.keys()]) {
        if (old < epoch) {
          this.keys.delete(old);
          this.last.delete(old);
        }
      }
    }
    stats.decrypted++;
    return { result: 'decrypted', plaintext, epoch };
  }
}
