//go:build windows

package secure

import (
	"os"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	cryptProtectUIForbidden  = 0x1
	cryptProtectLocalMachine = 0x4
)

func dpapiDisabled() bool { return os.Getenv("DRONSTREAM_NO_DPAPI") == "1" }

func dpapiProtect(data []byte) ([]byte, error) {
	if dpapiDisabled() {
		return nil, errNoDPAPI
	}
	in := windows.DataBlob{Size: uint32(len(data)), Data: &data[0]}
	var out windows.DataBlob
	name, _ := windows.UTF16PtrFromString("DronStream master key")
	if err := windows.CryptProtectData(&in, name, nil, 0, nil, cryptProtectUIForbidden|cryptProtectLocalMachine, &out); err != nil {
		return nil, err
	}
	defer windows.LocalFree(windows.Handle(unsafe.Pointer(out.Data)))
	return append([]byte(nil), unsafe.Slice(out.Data, out.Size)...), nil
}

func dpapiUnprotect(data []byte) ([]byte, error) {
	in := windows.DataBlob{Size: uint32(len(data)), Data: &data[0]}
	var out windows.DataBlob
	if err := windows.CryptUnprotectData(&in, nil, nil, 0, nil, cryptProtectUIForbidden, &out); err != nil {
		return nil, err
	}
	defer windows.LocalFree(windows.Handle(unsafe.Pointer(out.Data)))
	return append([]byte(nil), unsafe.Slice(out.Data, out.Size)...), nil
}
