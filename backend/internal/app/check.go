package app

import (
	"context"
	"crypto/tls"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
	"time"

	"dronstream/internal/config"
	"dronstream/internal/mtx"
	"dronstream/internal/store"
)

// CheckResult is the readiness report used by DronStreamStart / Tayyorla.
// It never opens the DB for writing (no migration) and never prints secrets.
type CheckResult struct {
	OK          bool         `json:"ok"`
	Running     bool         `json:"running"`
	Healthy     bool         `json:"healthy"`
	URL         string       `json:"url"`
	SetupNeeded bool         `json:"setupNeeded"`
	Problems    []Problem    `json:"problems"`
	Ports       []PortStatus `json:"ports"`
	DB          DBStatus     `json:"db"`
}

type Problem struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Fixable bool   `json:"fixable"` // DronStreamTayyorla can fix it safely
}

type PortStatus struct {
	Name  string `json:"name"`
	Proto string `json:"proto"`
	Addr  string `json:"addr"`
	Free  bool   `json:"free"`
}

type DBStatus struct {
	Exists         bool `json:"exists"`
	Version        int  `json:"version"`
	NeedsMigration bool `json:"needsMigration"`
	TooNew         bool `json:"tooNew"`
}

func portFree(proto, addr string) bool {
	if proto == "udp" {
		c, err := net.ListenPacket("udp", addr)
		if err != nil {
			return false
		}
		c.Close()
		return true
	}
	l, err := net.Listen("tcp", addr)
	if err != nil {
		return false
	}
	l.Close()
	return true
}

func Check(root, exeDir string) CheckResult {
	r := CheckResult{Problems: []Problem{}, Ports: []PortStatus{}}
	add := func(code, msg string, fix bool) { r.Problems = append(r.Problems, Problem{code, msg, fix}) }
	L := config.NewLayout(root)
	if _, err := os.Stat(L.ConfigFile); errors.Is(err, os.ErrNotExist) {
		add("config_missing", "Konfiguratsiya fayli yo'q: "+L.ConfigFile, true)
	}
	for _, d := range []string{L.DataDir, L.LogDir, L.SecretsDir, L.RuntimeDir, L.MediaDir} {
		if _, err := os.Stat(d); err != nil {
			add("dir_missing", "Papka yo'q: "+d, true)
			break
		}
	}
	cfg, err := config.Load(L.ConfigFile)
	if err != nil {
		add("config_invalid", "Konfiguratsiya xato (avtomatik tuzatilmaydi): "+err.Error(), false)
		return r
	}
	_, port, _ := net.SplitHostPort(cfg.Web.Listen)
	r.URL = "https://localhost"
	if port != "" && port != "443" {
		r.URL += ":" + port
	}
	r.URL += "/"
	bin := cfg.Media.Binary
	if bin == "" {
		bin = mtx.DefaultBinary(exeDir)
	}
	if !cfg.Media.DisableManagedMTX {
		if _, err := os.Stat(bin); err != nil {
			add("mediamtx_missing", "MediaMTX topilmadi: "+bin, true)
		}
	}
	// running?
	if c, err := net.DialTimeout("tcp", cfg.Web.InternalAddr, 300*time.Millisecond); err == nil {
		c.Close()
		r.Running = true
		if st, err := ctl(root, "status"); err == nil && st["auth"] == true && st["media"] == true {
			r.Healthy = true
		}
	}
	if !r.Running {
		ports := []PortStatus{
			{"HTTPS", "tcp", cfg.Web.Listen, false},
			{"ichki boshqaruv", "tcp", cfg.Web.InternalAddr, false},
			{"MediaMTX API", "tcp", cfg.Media.APIAddr, false},
			{"WebRTC signalling", "tcp", cfg.Media.WebRTCHTTPAddr, false},
			{"WebRTC ICE", "udp", cfg.Media.WebRTCUDPAddr, false},
		}
		if cfg.Media.RTMPListen != "" {
			ports = append(ports, PortStatus{"RTMP", "tcp", cfg.Media.RTMPListen, false})
		}
		if cfg.Media.RTMPSListen != "" {
			ports = append(ports, PortStatus{"RTMPS", "tcp", cfg.Media.RTMPSListen, false})
		}
		if cfg.Web.RedirectHTTP != "" {
			ports = append(ports, PortStatus{"HTTP redirect", "tcp", cfg.Web.RedirectHTTP, false})
		}
		for i := range ports {
			ports[i].Free = portFree(ports[i].Proto, ports[i].Addr)
			if !ports[i].Free {
				add("port_busy", fmt.Sprintf("Port band: %s %s/%s — boshqa dastur ishlatmoqda (avtomatik to'xtatilmaydi)", ports[i].Name, ports[i].Addr, ports[i].Proto), false)
			}
		}
		r.Ports = ports
	}
	// TLS files (only if user-provided)
	crt, key := filepath.Join(L.SecretsDir, "tls.crt"), filepath.Join(L.SecretsDir, "tls.key")
	if _, err := os.Stat(crt); err == nil {
		if _, err := tls.LoadX509KeyPair(crt, key); err != nil {
			add("tls_invalid", "TLS sertifikat/kalit yaroqsiz (tls.crt/tls.key mos emas yoki buzilgan) — avtomatik o'zgartirilmaydi: "+err.Error(), false)
		}
	}
	// DB (read-only)
	if _, err := os.Stat(L.DBFile); err == nil {
		r.DB.Exists = true
		db, err := sql.Open("sqlite", "file:"+filepath.ToSlash(L.DBFile)+"?mode=ro&_pragma=busy_timeout(3000)")
		if err == nil {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			err = db.QueryRowContext(ctx, `SELECT version FROM schema_version LIMIT 1`).Scan(&r.DB.Version)
			if err == nil {
				var n int
				if db.QueryRowContext(ctx, `SELECT count(*) FROM users WHERE role='admin'`).Scan(&n) == nil {
					r.SetupNeeded = n == 0
				}
			}
			cancel()
			db.Close()
		}
		if err != nil {
			add("db_unreadable", "Ma'lumotlar bazasini o'qib bo'lmadi (o'chirilmaydi; backupdan tiklashni ko'ring): "+err.Error(), false)
		} else if r.DB.Version > store.SchemaVersion {
			r.DB.TooNew = true
			add("db_too_new", fmt.Sprintf("Baza sxemasi v%d bu dasturdan yangi (v%d): mos versiyani ishlating yoki backupdan tiklang", r.DB.Version, store.SchemaVersion), false)
		} else if r.DB.Version < store.SchemaVersion {
			r.DB.NeedsMigration = true
		}
	} else {
		r.SetupNeeded = true
	}
	r.OK = len(r.Problems) == 0
	return r
}

func CheckCLI(root string, asJSON bool) int {
	exe, _ := os.Executable()
	r := Check(root, filepath.Dir(exe))
	if asJSON {
		b, _ := json.MarshalIndent(r, "", "  ")
		fmt.Println(string(b))
	} else {
		if r.Running {
			fmt.Println("Server ishlayapti; sog'lom:", r.Healthy)
		}
		for _, p := range r.Problems {
			fix := ""
			if p.Fixable {
				fix = " [Tayyorla tuzata oladi]"
			}
			fmt.Println(" -", p.Message+fix)
		}
		if r.DB.NeedsMigration {
			fmt.Printf("Baza v%d -> v%d migratsiya qilinadi (oldin avtomatik izchil nusxa olinadi)\n", r.DB.Version, store.SchemaVersion)
		}
		if r.OK {
			fmt.Println("Tayyor:", r.URL)
		}
	}
	if !r.OK {
		for _, p := range r.Problems {
			if !p.Fixable {
				return 4
			}
		}
		return 3
	}
	return 0
}

var _ = strings.TrimSpace
