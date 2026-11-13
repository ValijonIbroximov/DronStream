//go:build !windows

package secure

import (
	"os"
	"strings"
	"testing"
)

func TestMasterKeyFileModeEnforced(t *testing.T) {
	dir := t.TempDir()
	k1, err := LoadOrCreateMasterKey(dir)
	if err != nil {
		t.Fatal(err)
	}
	p := MasterKeyPath(dir)
	fi, _ := os.Stat(p)
	if fi.Mode().Perm() != 0o600 {
		t.Fatalf("new key has mode %04o, want 0600", fi.Mode().Perm())
	}
	raw, _ := os.ReadFile(p)
	if string(raw[:4]) != "DSK0" {
		t.Fatalf("unexpected key format %q on a non-Windows system", raw[:4])
	}
	k2, err := LoadOrCreateMasterKey(dir)
	if err != nil || string(k1) != string(k2) {
		t.Fatalf("reload: %v", err)
	}
	if err := os.Chmod(p, 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := LoadOrCreateMasterKey(dir); err == nil || !strings.Contains(err.Error(), "chmod 600") {
		t.Fatalf("world-readable key accepted: %v", err)
	}
}
