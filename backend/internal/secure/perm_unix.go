//go:build !windows

package secure

import (
	"fmt"
	"os"
)

// checkSecretFile refuses a secret file that group or others can access.
// On Linux this file mode (plus the dedicated service account that owns it)
// is the whole protection of the master key, so it is checked on every start.
func checkSecretFile(path string) error {
	fi, err := os.Stat(path)
	if err != nil {
		return err
	}
	if perm := fi.Mode().Perm(); perm&0o077 != 0 {
		return fmt.Errorf("%s has mode %04o: it must not be accessible by group or others. Fix: chmod 600 %s (and chmod 700 its directory)", path, perm, path)
	}
	return nil
}
