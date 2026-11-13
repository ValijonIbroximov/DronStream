// Minimal H.264 Annex-B inspection for the viewer: is this access unit a key
// frame, and which codec string describes it. No decoding happens here.

const NAL_IDR = 5;
const NAL_SPS = 7;

/** Offsets of the NAL header byte of every NAL unit (after 00 00 01 start codes). */
function nalOffsets(au) {
  const out = [];
  for (let i = 0; i + 3 < au.length; i++) {
    if (au[i] === 0 && au[i + 1] === 0 && au[i + 2] === 1) {
      out.push(i + 3);
      i += 2;
    }
  }
  return out;
}

/** True if the access unit contains an IDR slice. */
export function isKeyframe(au) {
  return nalOffsets(au).some((at) => (au[at] & 0x1f) === NAL_IDR);
}

/**
 * WebCodecs codec string from the SPS of a key frame, e.g. "avc1.42c01e"
 * (profile_idc, constraint flags, level_idc), or null if there is no SPS.
 */
export function codecFromKeyframe(au) {
  for (const at of nalOffsets(au)) {
    if ((au[at] & 0x1f) === NAL_SPS && at + 3 < au.length) {
      return 'avc1.' + [au[at + 1], au[at + 2], au[at + 3]].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  }
  return null;
}
