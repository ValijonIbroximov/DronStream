// Package wire is the framing used on the HTTP byte streams between source,
// relay and viewers: every SFrame ciphertext is preceded by its length as a
// 4-byte big-endian integer. There is nothing secret or authenticated about
// the framing itself; the relay may see and change it.
package wire

import (
	"encoding/binary"
	"errors"
	"io"
)

// MaxFrame bounds a single frame (4 MiB) so a peer cannot make us allocate
// arbitrary amounts of memory.
const MaxFrame = 4 << 20

var ErrTooLarge = errors.New("wire: frame larger than 4 MiB")

// WriteFrame writes one length-prefixed frame with a single Write call.
func WriteFrame(w io.Writer, frame []byte) error {
	if len(frame) > MaxFrame {
		return ErrTooLarge
	}
	buf := make([]byte, 4+len(frame))
	binary.BigEndian.PutUint32(buf, uint32(len(frame)))
	copy(buf[4:], frame)
	_, err := w.Write(buf)
	return err
}

// ReadFrame reads one length-prefixed frame. It returns io.EOF only on a
// clean end of stream between frames.
func ReadFrame(r io.Reader) ([]byte, error) {
	var head [4]byte
	if _, err := io.ReadFull(r, head[:]); err != nil {
		return nil, err // io.EOF if nothing was read, io.ErrUnexpectedEOF otherwise
	}
	n := binary.BigEndian.Uint32(head[:])
	if n > MaxFrame {
		return nil, ErrTooLarge
	}
	frame := make([]byte, n)
	if _, err := io.ReadFull(r, frame); err != nil {
		if err == io.EOF {
			err = io.ErrUnexpectedEOF
		}
		return nil, err
	}
	return frame, nil
}
