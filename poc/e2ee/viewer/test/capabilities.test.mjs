// An unsupported browser is refused; it never falls back to an unencrypted mode.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { checkCapabilities } from '../src/capabilities.js';

const full = () => ({
  isSecureContext: true,
  crypto: { subtle: { generateKey() {}, deriveBits() {}, decrypt() {} } },
  fetch() {},
  ReadableStream: function ReadableStream() {},
  VideoDecoder: function VideoDecoder() {},
  EncodedVideoChunk: function EncodedVideoChunk() {},
});

test('capabilities: a complete browser may start and show video', () => {
  assert.deepEqual(checkCapabilities(full()), { ok: true, reason: '', video: true, videoReason: '' });
});

test('capabilities: no secure context, no WebCrypto or no streaming -> the viewer is refused', () => {
  const insecure = full();
  insecure.isSecureContext = false;
  const noSubtle = full();
  noSubtle.crypto = {};
  const noCrypto = full();
  delete noCrypto.crypto;
  const partialSubtle = full();
  delete partialSubtle.crypto.subtle.deriveBits;
  const noStream = full();
  delete noStream.ReadableStream;
  for (const [name, g] of Object.entries({ insecure, noSubtle, noCrypto, partialSubtle, noStream, nothing: undefined })) {
    const result = checkCapabilities(g);
    assert.equal(result.ok, false, name);
    assert.equal(result.video, false, name);
    assert.ok(result.reason.length > 20, name);
  }
});

test('capabilities: without WebCodecs decryption still runs, only the picture is missing', () => {
  const g = full();
  delete g.VideoDecoder;
  const result = checkCapabilities(g);
  assert.equal(result.ok, true);
  assert.equal(result.video, false);
  assert.match(result.videoReason, /no picture is shown/);
});

test('page script: the capability check comes before the key, the join request and any frame', async () => {
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const start = main.slice(main.indexOf('async function start()'));
  const check = start.indexOf('checkCapabilities(globalThis)');
  assert.ok(check > 0, 'start() must call checkCapabilities(globalThis)');
  for (const later of ['generateViewerKey(', 'new Session(', 'postJoin(', 'frameLoop(', 'keyLoop(']) {
    assert.ok(start.indexOf(later) > check, later + ' must come after the capability check');
  }
  // the page has no code path that asks the relay for anything but ciphertext frames, joins and envelopes
  const sources = await Promise.all(['main.js', 'session.js'].map((f) => readFile(new URL('../src/' + f, import.meta.url), 'utf8')));
  for (const word of ['plaintext=1', 'unencrypted', 'fallback=', '/clear', '/raw']) {
    assert.ok(!sources.join('\n').includes(word), 'unexpected "' + word + '" in the page script');
  }
});
