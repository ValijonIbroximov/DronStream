// One viewing session: talks to the relay (join request, key envelopes, frame
// stream) and feeds the receiver. No DOM and no video decoding here, so the
// same code runs in the page and, for the automated chain test, under Node.
//
// The only network destination is the relay URL given by the user.

import { openEnvelope, toBase64, toHex } from './envelope.js';
import { Deframer, peekEpoch, Receiver } from './receiver.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class Session {
  /**
   * @param {object} o
   * @param {string} o.relay   relay base URL, no trailing slash
   * @param {string} o.stream  stream id
   * @param {string} o.label   free text shown to the operator
   * @param {{keyPair: CryptoKeyPair, publicKey: Uint8Array, fingerprint: Uint8Array}} o.key
   * @param {(text: string, kind: 'wait'|'ok'|'bad') => void} o.onState
   * @param {(message: string) => void} o.onLog
   * @param {(accessUnit: Uint8Array) => (void|Promise<void>)} o.onPlaintext  decrypted frame
   * @param {() => void} o.onLost  a frame was dropped (bad, or no key)
   */
  constructor({ relay, stream, label, key, onState, onLog, onPlaintext, onLost }) {
    this.relay = relay;
    this.stream = stream;
    this.label = label;
    this.key = key;
    this.onState = onState;
    this.onLog = onLog;
    this.onPlaintext = onPlaintext;
    this.onLost = onLost;
    this.receiver = new Receiver(stream);
    this.seenEnvelopes = new Set();
    this.envelopesOpened = 0;
    this.envelopesRejected = 0;
    this.keyQueue = Promise.resolve(); // serialises fetchKeys calls
    this.askedEpoch = null; // epoch we last asked the relay about because a frame needed it
    this.askedAt = 0;
    this.missingEpoch = null;
    this.missingSince = 0;
    this.abort = new AbortController();
  }

  get stopped() {
    return this.abort.signal.aborted;
  }

  stop() {
    this.abort.abort();
  }

  url(...parts) {
    return this.relay + '/v1/streams/' + encodeURIComponent(this.stream) + '/' + parts.join('/');
  }

  /** Sends this viewer's public key to the relay as a join request. */
  async postJoin() {
    const response = await fetch(this.url('joins'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pub: toBase64(this.key.publicKey), label: this.label }),
      signal: this.abort.signal,
    });
    if (!response.ok) throw new Error('relay refused the join request: HTTP ' + response.status);
  }

  /**
   * Downloads the envelopes addressed to this key and installs every key that
   * opens. Calls run one after another, so when a call returns, every
   * envelope the relay had at that time has been fully processed.
   */
  fetchKeys() {
    const run = this.keyQueue.then(() => this.fetchKeysNow());
    this.keyQueue = run.catch(() => {});
    return run;
  }

  async fetchKeysNow() {
    const response = await fetch(this.url('envelopes', toHex(this.key.fingerprint)), {
      cache: 'no-store',
      signal: this.abort.signal,
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const list = await response.json();
    if (!Array.isArray(list)) throw new Error('unexpected answer');
    if (this.seenEnvelopes.size > 2000) this.seenEnvelopes.clear(); // a misbehaving relay must not grow this forever
    for (const env of list.slice(0, 64)) {
      const id = JSON.stringify(env);
      if (this.seenEnvelopes.has(id)) continue;
      this.seenEnvelopes.add(id);
      try {
        const { epoch, suite, baseKey } = await openEnvelope(this.key.keyPair, this.key.fingerprint, this.stream, env);
        const added = await this.receiver.addKey(epoch, suite, baseKey);
        baseKey.fill(0);
        this.envelopesOpened++;
        if (added) this.onLog('key for epoch ' + epoch + ' received (SFrame cipher suite ' + suite + ')');
      } catch (e) {
        this.envelopesRejected++;
        this.onLog('an envelope was rejected: ' + e.message);
      }
    }
  }

  /** Polls for envelopes; repeats the join request while still unapproved. */
  async keyLoop() {
    for (let round = 0; !this.stopped; round++) {
      const unapproved = this.receiver.stats.epoch === 0 && this.receiver.keys.size === 0;
      try {
        if (unapproved && round % 5 === 4) await this.postJoin();
        await this.fetchKeys();
      } catch (e) {
        if (!this.stopped) this.onLog('key poll failed: ' + e.message);
      }
      await sleep(unapproved ? 1000 : 2500);
    }
  }

  /** Reads the frame stream until stopped, reconnecting after errors. */
  async frameLoop() {
    while (!this.stopped) {
      try {
        const response = await fetch(this.url('frames'), { cache: 'no-store', signal: this.abort.signal });
        if (!response.ok || !response.body) throw new Error('HTTP ' + response.status);
        this.onLog('connected to the frame stream');
        const reader = response.body.getReader();
        const deframer = new Deframer();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          for (const frame of deframer.push(value)) await this.handleFrame(frame);
        }
        this.onLog('frame stream ended');
      } catch (e) {
        if (!this.stopped) this.onLog('frame stream error: ' + e.message);
      }
      this.onLost();
      if (!this.stopped) await sleep(1000);
    }
  }

  async handleFrame(frame) {
    const stats = this.receiver.stats;
    const epoch = peekEpoch(frame);
    // A frame of a newer epoch than any key we hold: ask the relay for our
    // envelope before deciding (RFC 9605, Section 4.4.4 allows this retry).
    // Asked at once the first time an epoch shows up, then at most every 400 ms.
    if (
      epoch !== null &&
      epoch > stats.epoch &&
      !this.receiver.hasKey(epoch) &&
      (epoch !== this.askedEpoch || performance.now() - this.askedAt > 400)
    ) {
      this.askedEpoch = epoch;
      this.askedAt = performance.now();
      try {
        await this.fetchKeys();
      } catch (e) {
        if (!this.stopped) this.onLog('key fetch failed: ' + e.message);
      }
    }
    const outcome = await this.receiver.process(frame);
    switch (outcome.result) {
      case 'decrypted':
        this.missingEpoch = null;
        this.onState('decrypting (epoch ' + stats.epoch + ')', 'ok');
        await this.onPlaintext(outcome.plaintext);
        break;
      case 'auth-failure':
        this.onLost();
        break;
      case 'no-key':
        this.onLost();
        if (stats.epoch === 0) {
          this.onState('waiting for approval', 'wait');
        } else {
          // We had a key and the source moved on to an epoch we have no key for.
          if (this.missingEpoch !== outcome.epoch) {
            this.missingEpoch = outcome.epoch;
            this.missingSince = performance.now();
          }
          if (performance.now() - this.missingSince > 2000) {
            this.onState('revoked: no key for epoch ' + outcome.epoch, 'bad');
          }
        }
        break;
      case 'replay-rejected':
        break; // an extra copy: nothing was lost
    }
  }
}
