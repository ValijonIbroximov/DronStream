// Browser glue for viewer.html: DOM and WebCodecs only. Networking is in
// session.js; all cryptographic logic is in sframe.js, envelope.js and
// receiver.js (all of those are tested under Node).
//
// Text received from the network is only ever written with textContent.

import { checkCapabilities } from './capabilities.js';
import { formatFingerprint, generateViewerKey } from './envelope.js';
import { codecFromKeyframe, isKeyframe } from './h264.js';
import { Session } from './session.js';

const $ = (id) => document.getElementById(id);

function setState(text, kind) {
  $('state').textContent = text;
  $('state').className = 'state ' + kind;
}

function log(message) {
  const line = document.createElement('div');
  line.textContent = new Date().toLocaleTimeString() + '  ' + message;
  $('log').prepend(line);
  while ($('log').childElementCount > 200) $('log').lastChild.remove();
}

/** Decodes decrypted H.264 access units with WebCodecs and draws them. */
class VideoSink {
  constructor(canvas, note) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.note = note;
    this.decoder = null;
    this.needKeyframe = true; // true after start and after any lost frame
    this.timestamp = 0;
    this.errors = 0;
    this.pictures = 0;
    this.enabled = typeof VideoDecoder === 'function' && typeof EncodedVideoChunk === 'function';
    if (!this.enabled) {
      note('WebCodecs (VideoDecoder) is not available in this browser: frames are still decrypted and counted, but no picture is shown.');
    }
  }

  /** A frame was dropped (authentication failure, no key): wait for the next key frame. */
  lost() {
    this.needKeyframe = true;
  }

  disable(reason) {
    this.enabled = false;
    this.note(reason + ' Frames are still decrypted and counted, but no picture is shown.');
  }

  async push(accessUnit) {
    if (!this.enabled) return;
    const key = isKeyframe(accessUnit);
    if (this.needKeyframe && !key) return;
    if (key && (!this.decoder || this.decoder.state !== 'configured')) {
      const codec = codecFromKeyframe(accessUnit);
      if (!codec) return;
      // Annex-B H.264: no "description", parameter sets travel in key frames.
      const config = { codec, optimizeForLatency: true };
      let supported = false;
      try {
        supported = (await VideoDecoder.isConfigSupported(config)).supported === true;
      } catch {
        supported = false;
      }
      if (!supported) {
        this.disable('This browser cannot decode H.264 (' + codec + ') with WebCodecs.');
        return;
      }
      this.decoder = new VideoDecoder({
        output: (frame) => this.draw(frame),
        error: (e) => this.failed(e),
      });
      this.decoder.configure(config);
      this.note('Decoding ' + codec + ' with WebCodecs.');
    }
    if (!this.decoder || this.decoder.state !== 'configured' || this.decoder.decodeQueueSize > 30) {
      this.needKeyframe = true; // not ready or falling behind: resume at the next key frame
      return;
    }
    try {
      this.decoder.decode(
        new EncodedVideoChunk({ type: key ? 'key' : 'delta', timestamp: this.timestamp, data: accessUnit }),
      );
      this.timestamp += 66667; // nominal 15 fps; pictures are drawn as soon as they are decoded
      this.needKeyframe = false;
    } catch (e) {
      this.failed(e);
    }
  }

  failed(error) {
    this.needKeyframe = true;
    this.errors++;
    log('video decoder error: ' + (error && error.message ? error.message : String(error)));
    if (this.errors >= 3 && this.pictures === 0) {
      this.disable('The decrypted data could not be decoded as H.264 (the source may be sending synthetic frames).');
    }
  }

  draw(frame) {
    if (this.canvas.width !== frame.displayWidth || this.canvas.height !== frame.displayHeight) {
      this.canvas.width = frame.displayWidth;
      this.canvas.height = frame.displayHeight;
    }
    this.context.drawImage(frame, 0, 0);
    frame.close();
    this.pictures++;
  }
}

function render(session, video) {
  const s = session.receiver.stats;
  $('c-received').textContent = s.received;
  $('c-decrypted').textContent = s.decrypted;
  $('c-auth').textContent = s.authFailures;
  $('c-replays').textContent = s.replaysRejected;
  $('c-nokey').textContent = s.noKey;
  $('c-epoch').textContent = s.epoch === 0 ? '-' : s.epoch;
  $('c-envelopes').textContent = session.envelopesOpened + ' / ' + session.envelopesRejected;
  $('c-pictures').textContent = video.pictures;
}

async function start() {
  const relay = $('relay').value.trim().replace(/\/+$/, '');
  const stream = $('stream').value.trim();
  const label = $('label').value.trim();
  const url = new URL(relay); // throws on garbage
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('the relay URL must be http or https');
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(stream)) throw new Error('bad stream id');
  // Refuse before anything is generated or sent: see capabilities.js (no other mode exists).
  const capabilities = checkCapabilities(globalThis);
  if (!capabilities.ok) throw new Error(capabilities.reason);

  const key = await generateViewerKey();
  $('fingerprint').textContent = formatFingerprint(key.fingerprint);
  const video = new VideoSink($('canvas'), (text) => ($('video-note').textContent = text));
  const session = new Session({
    relay,
    stream,
    label,
    key,
    onState: setState,
    onLog: log,
    onPlaintext: (accessUnit) => video.push(accessUnit),
    onLost: () => video.lost(),
  });
  await session.postJoin();
  log('join request sent; fingerprint ' + formatFingerprint(key.fingerprint));
  setState('waiting for approval', 'wait');
  setInterval(() => render(session, video), 250);
  session.keyLoop();
  session.frameLoop();
}

// Optional prefill of the form, e.g. viewer.html?relay=http://127.0.0.1:59320&stream=demo
// The values only end up in the input fields; nothing starts until the button is pressed.
const query = new URLSearchParams(location.search);
for (const id of ['relay', 'stream', 'label']) {
  const value = query.get(id);
  if (value !== null && value.length <= 200) $(id).value = value;
}

$('join-form').addEventListener('submit', (event) => {
  event.preventDefault();
  $('join').disabled = true;
  for (const id of ['relay', 'stream', 'label']) $(id).readOnly = true;
  start().catch((e) => {
    setState('could not start: ' + e.message, 'bad');
    log(
      'start failed: ' + e.message + '. Check that the relay is running, that it allows this page origin (CORS) and that ' +
        'this page is allowed to connect to it (Content-Security-Policy of the viewer host). Reload the page to try again.',
    );
  });
});
