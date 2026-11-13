// The whole chain with the page's own JavaScript, without a browser:
//
//   Go source (separate process) -> Go relay (separate process) -> session.js under Node
//
// session.js, receiver.js, envelope.js and sframe.js are exactly the modules
// bundled into the viewer page. What this test cannot cover is what only a
// browser has: the DOM, CORS/CSP enforcement and WebCodecs video decoding.

import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { formatFingerprint, generateViewerKey } from '../src/envelope.js';
import { Session } from '../src/session.js';

const pocDir = fileURLToPath(new URL('../../', import.meta.url));
const exe = process.platform === 'win32' ? '.exe' : '';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function goMissing() {
  try {
    execFileSync('go', ['version'], { stdio: 'ignore' });
    return false;
  } catch {
    return 'go is not on PATH (run this suite through run-tests.sh / run-tests.ps1)';
  }
}

/** Starts a PoC program; only processes started here are stopped here. */
function startProgram(children, file, args) {
  const child = spawn(file, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  const lines = [];
  const waiters = [];
  const onLine = (line) => {
    lines.push(line);
    for (const w of waiters.splice(0)) {
      const m = w.pattern.exec(line);
      if (m) w.resolve(m);
      else waiters.push(w);
    }
  };
  createInterface({ input: child.stdout }).on('line', onLine);
  createInterface({ input: child.stderr }).on('line', onLine);
  return {
    lines,
    waitFor(pattern, ms = 30000) {
      for (const line of lines) {
        const m = pattern.exec(line);
        if (m) return Promise.resolve(m);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`no output matching ${pattern}; got:\n${lines.join('\n')}`)), ms);
        waiters.push({ pattern, resolve: (m) => (clearTimeout(timer), resolve(m)) });
      });
    },
  };
}

test('chain: Go source -> Go relay -> page JavaScript (approve, key changes, revoke)', { skip: goMissing(), timeout: 180000 }, async (t) => {
  const bin = await mkdtemp(path.join(tmpdir(), 'poc-e2ee-'));
  const children = [];
  let session;
  t.after(async () => {
    if (session) session.stop();
    for (const child of children) child.kill();
    await rm(bin, { recursive: true, force: true, maxRetries: 20, retryDelay: 200 });
  });

  execFileSync('go', ['build', '-o', bin + path.sep, './cmd/relay', './cmd/source', './cmd/operator'], { cwd: pocDir, stdio: 'inherit' });
  const program = (name) => path.join(bin, name + exe);

  const relay = startProgram(children, program('relay'), ['-port', '0']);
  const relayUrl = (await relay.waitFor(/^LISTEN (http:\/\/127\.0\.0\.1:\d+)$/))[1];
  // 60 fps of synthetic frames; every frame carries its own number, so order and gaps can be checked.
  const FPS = 60;
  const UNITS = FPS * 20;
  const source = startProgram(children, program('source'), ['-relay', relayUrl, '-stream', 'node-chain', '-synthetic', '-fps', String(FPS), '-control-port', '0']);
  const controlUrl = (await source.waitFor(/^CONTROL (http:\/\/127\.0\.0\.1:\d+)$/))[1];
  await source.waitFor(/^READY /);
  const operator = (...args) => {
    try {
      return execFileSync(program('operator'), ['-control', controlUrl, ...args], { encoding: 'utf8' });
    } catch (e) {
      return String(e.stdout); // non-zero exit, e.g. REFUSED
    }
  };

  const key = await generateViewerKey(); // non-extractable WebCrypto key, as in the page
  const fingerprint = formatFingerprint(key.fingerprint);
  const states = [];
  const frameNumbers = [];
  let lost = 0;
  session = new Session({
    relay: relayUrl,
    stream: 'node-chain',
    label: 'node',
    key,
    onState: (text) => {
      if (states.at(-1) !== text) states.push(text);
    },
    onLog: () => {},
    onPlaintext: (accessUnit) => {
      const text = Buffer.from(accessUnit).toString('latin1');
      const m = /PLAINTEXT-VIDEO-PAYLOAD-DRONSTREAM-POC-frame-(\d{6})-/.exec(text);
      assert.ok(m, 'decrypted frame must contain the plaintext the source encrypted');
      frameNumbers.push(Number(m[1]));
    },
    onLost: () => {
      lost++;
    },
  });
  const stats = session.receiver.stats;
  const until = async (what, condition, ms = 30000) => {
    for (const deadline = Date.now() + ms; !condition(); await sleep(25)) {
      if (Date.now() > deadline) assert.fail(`timed out waiting for ${what}; states: ${states.join(' | ')}; stats: ${JSON.stringify(stats)}`);
    }
  };

  await session.postJoin();
  session.keyLoop();
  session.frameLoop();

  // Not approved yet: frames arrive, none can be decrypted.
  await until('frames without a key', () => stats.noKey >= 20);
  assert.equal(stats.decrypted, 0);
  assert.equal(states.at(-1), 'waiting for approval');

  // The operator sees exactly the fingerprint text this viewer shows; a wrong one is refused.
  assert.ok(operator('list').includes(fingerprint), 'operator list shows the viewer fingerprint');
  assert.match(operator('approve', '0'.repeat(64)), /^REFUSED/);
  assert.match(operator('approve', fingerprint), /^approved /);
  await until('first decrypted frames', () => stats.decrypted >= 60);
  assert.equal(states.at(-1), 'decrypting (epoch 1)');

  // Five key changes while watching: no frame may be lost at any of them.
  const lostBefore = lost;
  for (let epoch = 2; epoch <= 6; epoch++) {
    await sleep(150 + epoch * 90); // different offsets relative to the viewer's own key polling
    assert.match(operator('rotate'), new RegExp(`now epoch ${epoch}`));
    await until(`epoch ${epoch}`, () => stats.epoch === epoch);
  }
  await until('frames in epoch 6', () => stats.decrypted >= frameNumbers.length && frameNumbers.length >= 200);
  assert.equal(lost, lostBefore, 'no frame lost across key changes');
  for (let i = 1; i < frameNumbers.length; i++) {
    assert.equal(frameNumbers[i], (frameNumbers[i - 1] + 1) % UNITS, `frame ${i}: every frame, in order, no gap`);
  }
  assert.equal(states.at(-1), 'decrypting (epoch 6)');
  assert.equal(session.envelopesOpened, 6);
  assert.equal(session.envelopesRejected, 0);

  // Revoke: the source moves to epoch 7 and this viewer gets no key for it.
  assert.match(operator('revoke', fingerprint), /^revoked .*now epoch 7/);
  await until('the revoked state', () => states.at(-1) === 'revoked: no key for epoch 7');
  const decryptedAtRevoke = stats.decrypted;
  const noKeyAtRevoke = stats.noKey;
  await until('more frames of the new epoch', () => stats.noKey >= noKeyAtRevoke + 30);
  assert.equal(stats.decrypted, decryptedAtRevoke, 'nothing decrypts after the revoke');
  assert.equal(stats.epoch, 6);
  assert.equal(stats.authFailures, 0);
  assert.equal(stats.replaysRejected, 0);
  assert.equal(stats.received, stats.decrypted + stats.noKey);
});
