package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"dronstream/internal/backup"
	"dronstream/internal/config"
	"dronstream/internal/secure"
	"dronstream/internal/store"
)

func jsonEnc(w io.Writer, v any) { json.NewEncoder(w).Encode(v) }

func ctl(root, cmd string) (map[string]any, error) {
	L := config.NewLayout(root)
	cfg, err := config.Load(L.ConfigFile)
	if err != nil {
		return nil, err
	}
	tok, err := os.ReadFile(filepath.Join(L.RuntimeDir, "ctl.token"))
	if err != nil {
		return nil, errors.New("server is not running (no ctl.token)")
	}
	method := http.MethodGet
	if cmd == "stop" {
		method = http.MethodPost
	}
	req, _ := http.NewRequest(method, "http://"+cfg.Web.InternalAddr+"/internal/ctl/"+cmd+"/"+strings.TrimSpace(string(tok)), nil)
	resp, err := (&http.Client{Timeout: 5 * time.Second}).Do(req)
	if err != nil {
		return nil, fmt.Errorf("server is not responding: %w", err)
	}
	defer resp.Body.Close()
	var out map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}
	return out, nil
}

// Status prints server status; returns error if not running or unhealthy.
func Status(root string) error {
	st, err := ctl(root, "status")
	if err != nil {
		return err
	}
	b, _ := json.MarshalIndent(st, "", "  ")
	fmt.Println(string(b))
	if st["auth"] != true || st["media"] != true {
		return errors.New("UNHEALTHY")
	}
	return nil
}

func Stop(root string) error {
	if _, err := ctl(root, "stop"); err != nil {
		return err
	}
	L := config.NewLayout(root)
	cfg, _ := config.Load(L.ConfigFile)
	for i := 0; i < 50; i++ {
		c, err := net.DialTimeout("tcp", cfg.Web.InternalAddr, 200*time.Millisecond)
		if err != nil {
			fmt.Println("DronStream to'xtatildi")
			return nil
		}
		c.Close()
		time.Sleep(200 * time.Millisecond)
	}
	return errors.New("server did not stop within 10 s")
}

func running(root string) bool {
	L := config.NewLayout(root)
	cfg, err := config.Load(L.ConfigFile)
	if err != nil {
		return false
	}
	c, err := net.DialTimeout("tcp", cfg.Web.InternalAddr, 300*time.Millisecond)
	if err != nil {
		return false
	}
	c.Close()
	return true
}

func ReadPassphrase(file string) (string, error) {
	if file != "" {
		b, err := os.ReadFile(file)
		if err != nil {
			return "", err
		}
		return strings.TrimRight(string(b), "\r\n"), nil
	}
	if p := os.Getenv("DRONSTREAM_BACKUP_PASSPHRASE"); p != "" {
		return p, nil
	}
	return "", errors.New("passphrase required: --passphrase-file FILE or DRONSTREAM_BACKUP_PASSPHRASE")
}

// BackupCLI makes a consistent encrypted backup (works while the server runs).
// With migrateOut the source server is switched to "migrated": it stops
// accepting publishers and viewers, so two servers never serve at once.
func BackupCLI(root, out, pass string, migrateOut bool) error {
	L := config.NewLayout(root)
	if err := L.Ensure(); err != nil {
		return err
	}
	key, err := secure.LoadOrCreateMasterKey(L.SecretsDir)
	if err != nil {
		return err
	}
	st, err := store.Open(L.DBFile)
	if err != nil {
		return err
	}
	defer st.Close()
	if out == "" {
		out = filepath.Join(L.BackupDir, "dronstream-"+time.Now().Format("20060102-150405")+".dsbak")
	}
	if err := CreateBackup(context.Background(), L, st, key, pass, out, migrateOut); err != nil {
		return err
	}
	if a, err := backup.OpenArchive(out, pass, L.RuntimeDir); err != nil { // verify it can be read back
		return fmt.Errorf("backup verification failed: %w", err)
	} else {
		fmt.Println("Media fayllar:", a.Manifest.MediaFiles)
		a.Close()
	}
	fmt.Println("Backup yaratildi va tekshirildi:", out)
	if migrateOut {
		if err := st.SetSetting(context.Background(), "instance_state", "migrated"); err != nil {
			return err
		}
		st.DB.Exec(`INSERT INTO audit_log(ts,actor_type,actor_name,action,target) VALUES(?,?,?,?,?)`, store.Now(), "system", "cli", "instance_state", "migrated")
		fmt.Println("Bu server 'migrated' holatiga o'tkazildi: endi publish va tomosha rad etiladi (1 s ichida).")
		fmt.Println("Qaytarish kerak bo'lsa (ko'chirish bekor qilinsa): dronstream activate --root", root)
	}
	return nil
}

// RestoreCLI restores a backup into ROOT (server must be stopped). The
// restored instance starts in STANDBY until an admin confirms the old server
// is off. Machine-bound secrets are re-bound (DPAPI) on this computer.
func RestoreCLI(root, in, pass string, force bool) error {
	if running(root) {
		return errors.New("stop DronStream first (dronstream stop)")
	}
	L0 := config.NewLayout(root)
	if err := L0.Ensure(); err != nil {
		return err
	}
	ar, err := backup.OpenArchive(in, pass, L0.RuntimeDir)
	if err != nil {
		return err
	}
	defer ar.Close()
	m, files := ar.Manifest, ar.Small
	if m.SchemaVersion > store.SchemaVersion {
		return fmt.Errorf("backup schema v%d is newer than this program (v%d): install the newer version first", m.SchemaVersion, store.SchemaVersion)
	}
	L := config.NewLayout(root)
	if err := L.Ensure(); err != nil {
		return err
	}
	if _, err := os.Stat(L.DBFile); err == nil {
		if !force {
			return fmt.Errorf("%s already exists; use --force to replace it (the old file is kept as .pre-restore)", L.DBFile)
		}
		ts := time.Now().Format("20060102-150405")
		for _, suf := range []string{"", "-wal", "-shm"} {
			if _, err := os.Stat(L.DBFile + suf); err == nil {
				if err := os.Rename(L.DBFile+suf, L.DBFile+suf+".pre-restore-"+ts); err != nil {
					return err
				}
			}
		}
		if _, err := os.Stat(secure.MasterKeyPath(L.SecretsDir)); err == nil {
			os.Rename(secure.MasterKeyPath(L.SecretsDir), secure.MasterKeyPath(L.SecretsDir)+".pre-restore-"+ts)
		}
	}
	if err := ar.WriteDB(L.DBFile); err != nil {
		return err
	}
	nMedia, err := ar.ExtractMedia(L.MediaDir)
	if err != nil {
		return fmt.Errorf("media: %w", err)
	}
	fmt.Println("Media fayllar tiklandi:", nMedia)
	if err := secure.WriteMasterKey(L.SecretsDir, files["master.key"]); err != nil {
		return err
	}
	notes := []string{}
	writeIfAbsent := func(name, dst string) {
		data, ok := files[name]
		if !ok {
			return
		}
		if _, err := os.Stat(dst); err == nil {
			// Never claim a copy that was not written (e.g. a read-only config directory on Linux).
			if err := os.WriteFile(dst+".from-backup", data, 0o600); err != nil {
				notes = append(notes, fmt.Sprintf("%s mavjud edi va o'zgartirilmadi; backupdagi nusxani yonida saqlab bo'lmadi (%v)", dst, err))
				return
			}
			notes = append(notes, fmt.Sprintf("%s mavjud edi — backupdagi nusxa %s.from-backup ga yozildi (qo'lda solishtiring)", dst, dst))
			return
		}
		if err := os.WriteFile(dst, data, 0o600); err != nil {
			notes = append(notes, fmt.Sprintf("%s ni backupdan yozib bo'lmadi (%v)", dst, err))
		}
	}
	writeIfAbsent("dronstream.yaml", L.ConfigFile)
	writeIfAbsent("tls.crt", filepath.Join(L.SecretsDir, "tls.crt"))
	writeIfAbsent("tls.key", filepath.Join(L.SecretsDir, "tls.key"))
	writeIfAbsent("turn.secret", filepath.Join(L.SecretsDir, "turn.secret"))

	st, err := store.Open(L.DBFile)
	if err != nil {
		return err
	}
	defer st.Close()
	now := store.Now()
	stmts := []string{
		`UPDATE settings SET value='standby' WHERE key='instance_state'`,
		`UPDATE web_sessions SET revoked_at=` + fmt.Sprint(now) + `, revoke_reason='restored' WHERE revoked_at IS NULL`,
		`UPDATE media_sessions SET status='ended', ended_at=` + fmt.Sprint(now) + `, end_reason='restored' WHERE status!='ended'`,
		`DELETE FROM playback_tickets`,
		// a used one-time link stays used after a move: no activation retries
		`UPDATE link_activations SET created_at=0`,
	}
	for _, q := range stmts {
		if _, err := st.DB.Exec(q); err != nil {
			return err
		}
	}
	st.SetSetting(context.Background(), "instance_id", store.NewInstanceID())
	st.SetSetting(context.Background(), "restored_from", m.InstanceID+"@"+m.Hostname+" "+m.CreatedAt.Format(time.RFC3339))
	st.DB.Exec(`INSERT INTO audit_log(ts,actor_type,actor_name,action,target,details) VALUES(?,?,?,?,?,?)`, now, "system", "cli", "restore", m.Hostname, `{"from":"`+m.InstanceID+`"}`)
	fmt.Printf("Tiklandi: %s (yaratilgan %s, manba kompyuter %s, versiya %s)\n", in, m.CreatedAt.Local().Format("2006-01-02 15:04"), m.Hostname, m.AppVersion)
	for _, n := range notes {
		fmt.Println(" -", n)
	}
	fmt.Println(`Server KUTISH (standby) rejimida ishga tushadi: publish va tomosha rad etiladi.
Keyingi qadamlar (BACKUP_RESTORE_UZ.md):
  1) config\dronstream.yaml da yangi IP/domen, publish_host, webrtc_additional_hosts ni yangilang.
  2) TLS sertifikat yangi domen/IP ga mosligini tekshiring.
  3) Firewall va VPN qoidalarini yangi kompyuterda sozlang.
  4) Eski server o'chirilganini tekshiring, so'ng admin panel → Tizim → "Serverni faollashtirish".
  5) Pultlardagi URL ni yangi manzilga almashtiring (kalitlar o'zgarmagan).`)
	return nil
}

// Activate switches a standby/migrated instance back to active (CLI).
func Activate(root string) error {
	L := config.NewLayout(root)
	st, err := store.Open(L.DBFile)
	if err != nil {
		return err
	}
	defer st.Close()
	if err := st.SetSetting(context.Background(), "instance_state", "active"); err != nil {
		return err
	}
	st.DB.Exec(`INSERT INTO audit_log(ts,actor_type,actor_name,action,target) VALUES(?,?,?,?,?)`, store.Now(), "system", "cli", "instance_state", "active")
	fmt.Println("Server faol holatga o'tkazildi.")
	return nil
}

// ResetAdmin sets a new random password for an admin (local recovery).
func ResetAdmin(root, username string) error {
	L := config.NewLayout(root)
	st, err := store.Open(L.DBFile)
	if err != nil {
		return err
	}
	defer st.Close()
	pw := secure.KeyToken(16)
	h, err := secure.HashPassword(pw)
	if err != nil {
		return err
	}
	res, err := st.DB.Exec(`UPDATE users SET password_hash=?, must_change_password=1, failed_logins=0, locked_until=0, status='active', totp_enabled=0, totp_enc=NULL, totp_pending_enc=NULL, totp_last_step=0 WHERE username=? AND role='admin'`, h, username)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return errors.New("admin not found")
	}
	st.DB.Exec(`UPDATE web_sessions SET revoked_at=?, revoke_reason='password_reset' WHERE user_id=(SELECT id FROM users WHERE username=?) AND revoked_at IS NULL`, store.Now(), username)
	st.DB.Exec(`DELETE FROM recovery_codes WHERE user_id=(SELECT id FROM users WHERE username=?)`, username)
	st.DB.Exec(`INSERT INTO audit_log(ts,actor_type,actor_name,action,target) VALUES(?,?,?,?,?)`, store.Now(), "system", "cli", "password_reset_totp_cleared", "user:"+username)
	fmt.Println("Yangi vaqtinchalik parol (birinchi kirishda almashtiring):", pw)
	fmt.Println("Ikkinchi bosqich (TOTP) va tiklash kodlari o'chirildi: kirgandan keyin qayta yoqing.")
	return nil
}
