// Cross-language interop: the JavaScript receiver must open the HPKE
// envelopes and decrypt the SFrame frames in both golden files.

import { test } from 'node:test';

import { checkGolden } from './golden-check.mjs';

test('Go to JS: envelopes sealed by Go crypto/hpke and frames encrypted by the Go SFrame code', async () => {
  await checkGolden('golden/go-to-js.json');
});

test('JS to JS: the fixture written by gen-golden.mjs (also read by the Go test TestGoldenJSToGo)', async () => {
  await checkGolden('golden/js-to-go.json');
});
