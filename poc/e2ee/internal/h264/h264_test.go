package h264

import (
	"bytes"
	"testing"
)

func TestAccessUnitsRoundTripSynthetic(t *testing.T) {
	want := Synthetic(47, 15)
	var streamBytes []byte
	for _, u := range want {
		streamBytes = append(streamBytes, u...)
	}
	got := AccessUnits(streamBytes)
	if len(got) != len(want) {
		t.Fatalf("split into %d access units, want %d", len(got), len(want))
	}
	keys := 0
	for i := range want {
		if !bytes.Equal(got[i], want[i]) {
			t.Fatalf("access unit %d differs", i)
		}
		if IsKeyframe(got[i]) {
			keys++
			if !HasParameterSets(got[i]) {
				t.Errorf("key frame %d has no SPS/PPS", i)
			}
		}
	}
	if keys != 4 { // frames 0, 15, 30, 45
		t.Fatalf("found %d key frames, want 4", keys)
	}
}

func TestAccessUnitsMultiSliceAndStartCodes(t *testing.T) {
	// One picture in two slices (second slice has first_mb_in_slice != 0),
	// then a new picture; mixed 3- and 4-byte start codes.
	data := []byte{
		0, 0, 0, 1, 0x67, 1, 2, // SPS
		0, 0, 1, 0x68, 3, // PPS
		0, 0, 1, 0x65, 0x88, 9, 9, // IDR slice, first_mb_in_slice == 0
		0, 0, 1, 0x65, 0x10, 9, 9, // second slice of the same picture
		0, 0, 0, 1, 0x41, 0x9a, 7, 7, // P slice of the next picture
	}
	units := AccessUnits(data)
	if len(units) != 2 {
		t.Fatalf("got %d access units, want 2", len(units))
	}
	if !IsKeyframe(units[0]) || IsKeyframe(units[1]) || !HasParameterSets(units[0]) {
		t.Fatal("key frame detection wrong")
	}
	if !bytes.Equal(append(append([]byte{}, units[0]...), units[1]...), data) {
		t.Fatal("access units do not concatenate back to the input")
	}
	if AccessUnits(nil) != nil || AccessUnits([]byte{1, 2, 3}) != nil {
		t.Fatal("garbage must yield no access units")
	}
}

// TestFFmpegPattern checks the splitter on real libx264 output. It is skipped
// when ffmpeg is not installed.
func TestFFmpegPattern(t *testing.T) {
	ffmpeg := FindFFmpeg()
	if ffmpeg == "" {
		t.Skip("ffmpeg not found (set FFMPEG to its path to run this test)")
	}
	data, err := TestPattern(ffmpeg, 15, 2, 15)
	if err != nil {
		t.Fatal(err)
	}
	units := AccessUnits(data)
	keys := 0
	for i, u := range units {
		if IsKeyframe(u) {
			keys++
			if !HasParameterSets(u) {
				t.Errorf("key frame %d has no SPS/PPS: a late viewer could not start there", i)
			}
		}
	}
	if len(units) != 30 || keys != 2 || !IsKeyframe(units[0]) {
		t.Fatalf("2 s at 15 fps with GOP 15: got %d access units and %d key frames, want 30 and 2", len(units), keys)
	}
	t.Logf("ffmpeg test pattern: %s", Describe(units))
}
