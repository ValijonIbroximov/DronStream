// What this browser must be able to do before the viewer may start.
//
// There is deliberately NO fallback to an unencrypted mode anywhere in this
// proof of concept: the relay only ever carries SFrame ciphertext, and a
// browser that cannot do the cryptography is refused before any request is
// sent. A browser that can decrypt but cannot decode H.264 with WebCodecs
// still only handles ciphertext from the network: it shows counters and no
// picture.

/**
 * @param {object} g  the global object (globalThis in the page; a stub in tests)
 * @returns {{ok: boolean, reason: string, video: boolean, videoReason: string}}
 *   ok=false: the viewer must not start (no key, no join request, no frames).
 *   video=false: decryption works, but no picture can be shown.
 */
export function checkCapabilities(g) {
  const refuse = (reason) => ({ ok: false, reason, video: false, videoReason: reason });
  if (!g || g.isSecureContext !== true) {
    return refuse('this page is not a secure context (https or localhost): WebCrypto is unavailable, the viewer does not start');
  }
  const subtle = g.crypto && g.crypto.subtle;
  if (!subtle || typeof subtle.generateKey !== 'function' || typeof subtle.deriveBits !== 'function' || typeof subtle.decrypt !== 'function') {
    return refuse('this browser has no WebCrypto (crypto.subtle): frames cannot be decrypted, and there is no unencrypted mode');
  }
  if (typeof g.fetch !== 'function' || typeof g.ReadableStream !== 'function') {
    return refuse('this browser cannot read a streamed response (fetch / ReadableStream)');
  }
  const video = typeof g.VideoDecoder === 'function' && typeof g.EncodedVideoChunk === 'function';
  return {
    ok: true,
    reason: '',
    video,
    videoReason: video ? '' : 'WebCodecs (VideoDecoder) is not available in this browser: frames are still decrypted and counted, but no picture is shown',
  };
}
