package secure

import (
	"crypto/rand"
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

// Master key file format: 4-byte magic + payload.
//   "DSK1" + DPAPI(LocalMachine)-protected 32 bytes   (Windows, bound to this machine)
//   "DSK0" + raw 32 bytes                             (Linux and other systems: no DPAPI; protected by file
//                                                      mode 0600 in a 0700 directory owned by the service user)
// The key encrypts stream publish keys at rest (so the admin can view them
// again). A machine-bound key must be re-bound after migration: backups carry
// the raw key inside the passphrase-encrypted archive and restore re-protects
// it with DPAPI on the new machine.

const masterKeyName = "master.key"

func MasterKeyPath(secretsDir string) string { return filepath.Join(secretsDir, masterKeyName) }

func LoadOrCreateMasterKey(secretsDir string) ([]byte, error) {
	p := MasterKeyPath(secretsDir)
	b, err := os.ReadFile(p)
	if errors.Is(err, os.ErrNotExist) {
		key := make([]byte, 32)
		if _, err := rand.Read(key); err != nil {
			return nil, err
		}
		if err := WriteMasterKey(secretsDir, key); err != nil {
			return nil, err
		}
		return key, nil
	}
	if err != nil {
		return nil, err
	}
	// Where no machine-bound protection exists (Linux), the key is only as
	// private as the file: refuse to run with a key that others can read.
	if err := checkSecretFile(p); err != nil {
		return nil, err
	}
	return decodeMasterKey(b)
}

func WriteMasterKey(secretsDir string, key []byte) error {
	if len(key) != 32 {
		return errors.New("master key must be 32 bytes")
	}
	if err := os.MkdirAll(secretsDir, 0o700); err != nil {
		return err
	}
	var out []byte
	if prot, err := dpapiProtect(key); err == nil {
		out = append([]byte("DSK1"), prot...)
	} else if errors.Is(err, errNoDPAPI) {
		out = append([]byte("DSK0"), key...)
	} else {
		return fmt.Errorf("DPAPI: %w", err)
	}
	tmp := MasterKeyPath(secretsDir) + ".tmp"
	if err := os.WriteFile(tmp, out, 0o600); err != nil {
		return err
	}
	return os.Rename(tmp, MasterKeyPath(secretsDir))
}

func decodeMasterKey(b []byte) ([]byte, error) {
	if len(b) < 4 {
		return nil, errors.New("master.key corrupted")
	}
	switch string(b[:4]) {
	case "DSK0":
		if len(b) != 36 {
			return nil, errors.New("master.key corrupted")
		}
		return b[4:], nil
	case "DSK1":
		k, err := dpapiUnprotect(b[4:])
		if err != nil {
			return nil, fmt.Errorf("master.key cannot be unlocked on this machine (DPAPI). If the server was moved, restore from an encrypted backup to re-bind secrets: %w", err)
		}
		return k, nil
	}
	return nil, errors.New("master.key: unknown format")
}

var errNoDPAPI = errors.New("dpapi unavailable")
