package mtx

import (
	"path/filepath"
	"runtime"
)

// BinaryFileName is the MediaMTX executable name on this platform.
func BinaryFileName() string {
	if runtime.GOOS == "windows" {
		return "mediamtx.exe"
	}
	return "mediamtx"
}

// DefaultBinary is where MediaMTX is expected when the configuration does
// not name it: in a "mediamtx" folder next to the DronStream executable.
func DefaultBinary(exeDir string) string {
	return filepath.Join(exeDir, "mediamtx", BinaryFileName())
}
