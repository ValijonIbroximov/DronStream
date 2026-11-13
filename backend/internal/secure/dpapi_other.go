//go:build !windows

package secure

func dpapiProtect(data []byte) ([]byte, error)   { return nil, errNoDPAPI }
func dpapiUnprotect(data []byte) ([]byte, error) { return nil, errNoDPAPI }
