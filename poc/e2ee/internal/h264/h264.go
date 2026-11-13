// Package h264 does the minimum Annex-B handling the PoC needs: splitting a
// raw H.264 byte stream into access units (one coded picture each) and
// telling key frames apart. No decoding happens here.
package h264

import "fmt"

// NAL unit types used below (ITU-T H.264, Table 7-1).
const (
	nalIDR = 5
	nalSPS = 7
	nalPPS = 8
)

// nal describes one NAL unit inside an Annex-B buffer.
type nal struct {
	start   int // offset of the first byte of its start code
	payload int // offset of the NAL header byte
	end     int // offset just past the NAL (start of the next start code)
}

// scan finds all NAL units. A start code is 00 00 01, optionally preceded by
// one more 00 (the 4-byte form), which is then counted as part of it.
func scan(data []byte) []nal {
	var out []nal
	for i := 0; i+3 <= len(data); i++ {
		if data[i] != 0 || data[i+1] != 0 || data[i+2] != 1 {
			continue
		}
		start := i
		if i > 0 && data[i-1] == 0 {
			start = i - 1
		}
		if len(out) > 0 {
			out[len(out)-1].end = start
		}
		if i+3 < len(data) {
			out = append(out, nal{start: start, payload: i + 3, end: len(data)})
		}
		i += 2
	}
	return out
}

func isVCL(t byte) bool { return t >= 1 && t <= 5 }

// AccessUnits splits an Annex-B stream into access units. Each returned slice
// keeps its start codes, so it can be handed to a decoder as is.
//
// A new access unit starts (H.264, 7.4.1.2.3, simplified) when, after at
// least one slice of the current picture, we meet either a non-slice NAL
// (AUD, SPS, PPS, SEI, ...) or a slice with first_mb_in_slice == 0.
func AccessUnits(data []byte) [][]byte {
	nals := scan(data)
	if len(nals) == 0 {
		return nil
	}
	var units [][]byte
	auStart, hasSlice := nals[0].start, false
	for _, n := range nals {
		t := data[n.payload] & 0x1f
		slice := isVCL(t)
		// first_mb_in_slice is the first ue(v) of the slice header: it is 0
		// exactly when the first bit after the NAL header byte is 1.
		firstSlice := slice && n.payload+1 < n.end && data[n.payload+1]&0x80 != 0
		if hasSlice && (!slice || firstSlice) {
			units = append(units, data[auStart:n.start])
			auStart, hasSlice = n.start, false
		}
		if slice {
			hasSlice = true
		}
	}
	return append(units, data[auStart:])
}

// IsKeyframe reports whether the access unit contains an IDR slice.
func IsKeyframe(au []byte) bool {
	for _, n := range scan(au) {
		if au[n.payload]&0x1f == nalIDR {
			return true
		}
	}
	return false
}

// HasParameterSets reports whether the access unit carries both SPS and PPS.
func HasParameterSets(au []byte) bool {
	var sps, pps bool
	for _, n := range scan(au) {
		switch au[n.payload] & 0x1f {
		case nalSPS:
			sps = true
		case nalPPS:
			pps = true
		}
	}
	return sps && pps
}

// Describe summarises a list of access units for log output.
func Describe(units [][]byte) string {
	keys, bytes := 0, 0
	for _, u := range units {
		bytes += len(u)
		if IsKeyframe(u) {
			keys++
		}
	}
	return fmt.Sprintf("%d access units, %d key frames, %d bytes", len(units), keys, bytes)
}

// Markers that the synthetic frames carry in clear. Tests search the relay's
// traffic for them: they must never appear there.
var (
	SyntheticSPS = []byte{0x67, 0x42, 0xC0, 0x1E, 0xD9, 0x00, 0xA0, 0x47, 0xFE, 0x88}
	SyntheticPPS = []byte{0x68, 0xCE, 0x3C, 0x80}
	// SyntheticPattern is a recognisable plaintext string inside every frame.
	SyntheticPattern = []byte("PLAINTEXT-VIDEO-PAYLOAD-DRONSTREAM-POC")
)

// Synthetic builds n fake access units with the structure of a real stream
// (SPS+PPS+IDR every gop frames, single-slice P frames otherwise). They are
// not decodable video; they exist so tests and the no-ffmpeg fallback have
// deterministic, recognisable plaintext.
func Synthetic(n, gop int) [][]byte {
	startCode := []byte{0, 0, 0, 1}
	units := make([][]byte, 0, n)
	for i := 0; i < n; i++ {
		var au []byte
		sliceHeader := byte(0x41) // nal_ref_idc 2, type 1 (non-IDR slice)
		if i%gop == 0 {
			au = append(au, startCode...)
			au = append(au, SyntheticSPS...)
			au = append(au, startCode...)
			au = append(au, SyntheticPPS...)
			sliceHeader = 0x65 // nal_ref_idc 3, type 5 (IDR slice)
		}
		au = append(au, startCode...)
		au = append(au, sliceHeader, 0x88) // 0x88: first_mb_in_slice == 0
		au = append(au, SyntheticPattern...)
		au = append(au, fmt.Sprintf("-frame-%06d-", i)...)
		// Filler without zero bytes, so no accidental start code appears.
		for j := 0; j < 200+(i*37)%600; j++ {
			au = append(au, byte(1+(i*31+j*7)%251))
		}
		units = append(units, au)
	}
	return units
}
