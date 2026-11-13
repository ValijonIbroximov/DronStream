//go:build windows

package secure

// On Windows the master key is wrapped with DPAPI (bound to this machine),
// and access is governed by NTFS ACLs, not by a Unix mode.
func checkSecretFile(string) error { return nil }
