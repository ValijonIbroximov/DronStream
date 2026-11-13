// Package config loads DronStream settings (non-secret YAML) and resolves the
// on-disk layout: program, configuration, database and logs live apart.
package config

import (
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// Layout is the directory layout under ROOT.
type Layout struct {
	Root       string
	ConfigFile string
	SecretsDir string
	DataDir    string
	DBFile     string
	BackupDir  string
	RuntimeDir string
	LogDir     string
	MediaDir   string
}

func NewLayout(root string) Layout {
	root = filepath.Clean(root)
	return Layout{
		Root:       root,
		ConfigFile: filepath.Join(root, "config", "dronstream.yaml"),
		SecretsDir: filepath.Join(root, "config", "secrets"),
		DataDir:    filepath.Join(root, "data"),
		DBFile:     filepath.Join(root, "data", "dronstream.db"),
		BackupDir:  filepath.Join(root, "data", "backups"),
		RuntimeDir: filepath.Join(root, "data", "runtime"),
		LogDir:     filepath.Join(root, "logs"),
		MediaDir:   filepath.Join(root, "data", "media"),
	}
}

func (l Layout) Ensure() error {
	for _, d := range []string{filepath.Dir(l.ConfigFile), l.SecretsDir, l.DataDir, l.BackupDir, l.RuntimeDir, l.LogDir, l.MediaDir} {
		if err := os.MkdirAll(d, 0o700); err != nil {
			return err
		}
	}
	return nil
}

// ResolveRoot picks ROOT: explicit flag, DRONSTREAM_ROOT, or derived from the
// executable location (<ROOT>\app\<ver>\dronstream.exe -> <ROOT>).
func ResolveRoot(flagRoot string) (string, error) {
	if flagRoot != "" {
		return filepath.Abs(flagRoot)
	}
	if env := os.Getenv("DRONSTREAM_ROOT"); env != "" {
		return filepath.Abs(env)
	}
	exe, err := os.Executable()
	if err != nil {
		return "", err
	}
	dir := filepath.Dir(exe)
	parent := filepath.Dir(dir)
	if strings.EqualFold(filepath.Base(parent), "app") {
		return filepath.Dir(parent), nil
	}
	return dir, nil
}

type Config struct {
	Web      WebConfig      `yaml:"web"`
	Media    MediaConfig    `yaml:"media"`
	TURN     TURNConfig     `yaml:"turn"`
	Security SecurityConfig `yaml:"security"`
	Logging  LoggingConfig  `yaml:"logging"`
	Demo     DemoConfig     `yaml:"demo"`
	Library  LibraryConfig  `yaml:"library"`
}

// LibraryConfig limits uploaded media (images, videos, text).
type LibraryConfig struct {
	MaxImageMB int64 `yaml:"max_image_mb"`
	MaxVideoMB int64 `yaml:"max_video_mb"`
}

type WebConfig struct {
	Listen       string   `yaml:"listen"`        // HTTPS listener, e.g. ":8443"
	RedirectHTTP string   `yaml:"redirect_http"` // optional plain HTTP -> HTTPS redirect, e.g. ":8080"; empty = off
	PublicHosts  []string `yaml:"public_hosts"`  // hostnames/IPs users type in the browser (cert SANs, origin check)
	ACMEDomain   string   `yaml:"acme_domain"`   // optional Let's Encrypt domain (needs :443 reachable)
	ACMEEmail    string   `yaml:"acme_email"`
	InternalAddr string   `yaml:"internal_listen"` // loopback-only hook/control listener
	// PublicBaseURL is the external address used in shared links and QR codes,
	// e.g. https://stream.example.uz:8443 (can also be set in the admin UI).
	PublicBaseURL string `yaml:"public_base_url"`
}

type MediaConfig struct {
	Binary             string   `yaml:"mediamtx_binary"`   // path to mediamtx.exe; empty = next to dronstream.exe
	APIAddr            string   `yaml:"api_listen"`        // loopback only
	WebRTCHTTPAddr     string   `yaml:"webrtc_http_listen"`// loopback only
	WebRTCUDPAddr      string   `yaml:"webrtc_udp_listen"` // public ICE UDP
	WebRTCTCPAddr      string   `yaml:"webrtc_tcp_listen"` // optional ICE TCP
	WebRTCHosts        []string `yaml:"webrtc_additional_hosts"`
	WebRTCInterfaces   bool     `yaml:"webrtc_ips_from_interfaces"`
	RTMPListen         string   `yaml:"rtmp_listen"`  // e.g. "10.8.0.1:1935" (VPN only) or ":1935"
	RTMPSListen        string   `yaml:"rtmps_listen"` // empty = RTMPS off
	PublishHost        string   `yaml:"publish_host"` // host shown in pult URLs (VPN IP or domain)
	LeaseSeconds       int      `yaml:"lease_seconds"`
	TicketTTLSeconds   int      `yaml:"ticket_ttl_seconds"`
	MaxPerUser         int      `yaml:"max_media_sessions_per_subject"`
	ReconcileMillis    int      `yaml:"reconcile_interval_ms"`
	LogLevel           string   `yaml:"mediamtx_log_level"`
	DisableManagedMTX  bool     `yaml:"external_mediamtx"` // tests only: do not spawn MediaMTX
}

type TURNConfig struct {
	Mode        string   `yaml:"mode"` // "off" | "builtin" | "external"
	URLs        []string `yaml:"urls"` // e.g. turn:turn.example.org:3478?transport=udp
	Listen      string   `yaml:"listen"`
	PublicIP    string   `yaml:"public_ip"`
	Realm       string   `yaml:"realm"`
	RelayMin    int      `yaml:"relay_port_min"`
	RelayMax    int      `yaml:"relay_port_max"`
	CredMinutes int      `yaml:"credential_minutes"`
	STUNURLs    []string `yaml:"stun_urls"` // only own STUN; empty by default (no hidden external services)
}

type SecurityConfig struct {
	SessionHours      int    `yaml:"session_hours"`
	IdleMinutes       int    `yaml:"idle_minutes"`
	GuestMaxHours     int    `yaml:"guest_max_hours"`
	MaxPendingGuests  int    `yaml:"max_pending_guests"`
	AuditRetainDays   int    `yaml:"audit_retention_days"`
	TrustProxyHeaders bool   `yaml:"trust_proxy_headers"`
	SameSite          string `yaml:"cookie_samesite"` // Strict (default) or Lax
}

type LoggingConfig struct {
	Level     string `yaml:"level"`
	MaxSizeMB int    `yaml:"max_size_mb"`
	Keep      int    `yaml:"keep_files"`
}

type DemoConfig struct {
	Enabled bool `yaml:"enabled"`
}

func Default() Config {
	return Config{
		Web: WebConfig{Listen: ":8443", InternalAddr: "127.0.0.1:9180", PublicHosts: []string{"localhost"}},
		Media: MediaConfig{
			APIAddr: "127.0.0.1:9997", WebRTCHTTPAddr: "127.0.0.1:8889", WebRTCUDPAddr: ":8189",
			WebRTCInterfaces: true, RTMPListen: ":1935", LeaseSeconds: 120, TicketTTLSeconds: 30,
			MaxPerUser: 12, ReconcileMillis: 1000, LogLevel: "info", PublishHost: "localhost",
		},
		TURN:     TURNConfig{Mode: "off", Listen: ":3478", Realm: "dronstream", RelayMin: 50000, RelayMax: 50100, CredMinutes: 10},
		Security: SecurityConfig{SessionHours: 24, IdleMinutes: 480, GuestMaxHours: 24, MaxPendingGuests: 50, AuditRetainDays: 180, SameSite: "Strict"},
		Logging:  LoggingConfig{Level: "info", MaxSizeMB: 20, Keep: 5},
		Demo:     DemoConfig{Enabled: true},
		Library:  LibraryConfig{MaxImageMB: 25, MaxVideoMB: 2048},
	}
}

func Load(path string) (Config, error) {
	cfg := Default()
	b, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return cfg, nil
	}
	if err != nil {
		return cfg, err
	}
	if err := yaml.Unmarshal(b, &cfg); err != nil {
		return cfg, fmt.Errorf("config %s: %w", path, err)
	}
	return cfg, cfg.Validate()
}

func (c *Config) Validate() error {
	for name, a := range map[string]string{"web.internal_listen": c.Web.InternalAddr, "media.api_listen": c.Media.APIAddr, "media.webrtc_http_listen": c.Media.WebRTCHTTPAddr} {
		host, _, err := net.SplitHostPort(a)
		if err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}
		if ip := net.ParseIP(host); ip == nil || !ip.IsLoopback() {
			return fmt.Errorf("%s must be a loopback address (127.0.0.1:port); got %q", name, a)
		}
	}
	if c.Media.LeaseSeconds < 15 {
		c.Media.LeaseSeconds = 15
	}
	if c.Media.TicketTTLSeconds < 5 {
		c.Media.TicketTTLSeconds = 5
	}
	if c.Media.ReconcileMillis < 200 {
		c.Media.ReconcileMillis = 200
	}
	if c.Media.MaxPerUser < 1 {
		c.Media.MaxPerUser = 1
	}
	switch c.TURN.Mode {
	case "", "off", "builtin", "external":
	default:
		return fmt.Errorf("turn.mode must be off|builtin|external")
	}
	if c.Library.MaxImageMB <= 0 {
		c.Library.MaxImageMB = 25
	}
	if c.Library.MaxVideoMB <= 0 {
		c.Library.MaxVideoMB = 2048
	}
	if c.Security.SameSite != "Lax" {
		c.Security.SameSite = "Strict"
	}
	return nil
}

func (c *Config) Lease() time.Duration     { return time.Duration(c.Media.LeaseSeconds) * time.Second }
func (c *Config) TicketTTL() time.Duration { return time.Duration(c.Media.TicketTTLSeconds) * time.Second }
