// Package app wires DronStream together: config, DB, MediaMTX child process,
// media enforcement, HTTPS server, demo sources and the loopback control port.
package app

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"dronstream/internal/backup"
	"dronstream/internal/config"
	"dronstream/internal/core"
	"dronstream/internal/demo"
	"dronstream/internal/logx"
	"dronstream/internal/media"
	"dronstream/internal/mtx"
	"dronstream/internal/secure"
	"dronstream/internal/store"
	"dronstream/internal/tlsutil"
	"dronstream/internal/turnsrv"
	"dronstream/internal/web"
	"dronstream/internal/webui"
)

var Version = "dev"

type Options struct {
	Root    string
	Console bool // also log to stdout
}

// Run starts the server and blocks until ctx is cancelled or a fatal error.
func Run(ctx context.Context, opt Options) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	L := config.NewLayout(opt.Root)
	if err := L.Ensure(); err != nil {
		return err
	}
	cfg, err := config.Load(L.ConfigFile)
	if err != nil {
		return err
	}
	masker := &logx.Masker{}
	logFile, err := logx.NewRotating(filepath.Join(L.LogDir, "dronstream.log"), cfg.Logging.MaxSizeMB, cfg.Logging.Keep)
	if err != nil {
		return err
	}
	defer logFile.Close()
	var lw io.Writer = logFile
	if opt.Console {
		lw = io.MultiWriter(logFile, os.Stdout)
	}
	log := slog.New(logx.NewHandler(lw, logx.ParseLevel(cfg.Logging.Level), masker))
	log.Info("DronStream starting", "version", Version, "root", L.Root, "mediamtx", mtx.PinnedVersion)

	// The loopback control/hook listener doubles as a single-instance lock.
	internalLn, err := net.Listen("tcp", cfg.Web.InternalAddr)
	if err != nil {
		return fmt.Errorf("internal port %s busy — is DronStream already running? (%w)", cfg.Web.InternalAddr, err)
	}
	defer internalLn.Close()

	key, err := secure.LoadOrCreateMasterKey(L.SecretsDir)
	if err != nil {
		return err
	}
	st, err := store.Open(L.DBFile)
	if err != nil {
		return err
	}
	defer st.Close()
	svc := core.New(st, &cfg, key, log)

	// One-time setup token (only while no admin exists).
	setup := newSetupToken(L, svc, log, opt.Console)

	tlsCfg, acme, tlsInfo, err := tlsutil.Load(L.SecretsDir, cfg.Web.PublicHosts, cfg.Web.ACMEDomain, cfg.Web.ACMEEmail)
	if err != nil {
		return fmt.Errorf("TLS: %w", err)
	}
	if tlsInfo.Mode == "self-signed" {
		log.Warn("HTTPS uses a SELF-SIGNED certificate; browsers will warn. Install a CA-issued certificate for production (see README_UZ.md)", "sha256", tlsInfo.Fingerprint)
	}

	hookSecret := secure.Token(24)
	ctlToken := secure.Token(24)
	if err := os.WriteFile(filepath.Join(L.RuntimeDir, "ctl.token"), []byte(ctlToken), 0o600); err != nil {
		return err
	}
	defer os.Remove(filepath.Join(L.RuntimeDir, "ctl.token"))

	turnSecret := ""
	if cfg.TURN.Mode == "builtin" || cfg.TURN.Mode == "external" {
		turnSecret, err = loadOrCreateSecret(filepath.Join(L.SecretsDir, "turn.secret"))
		if err != nil {
			return err
		}
	}

	api := mtx.NewClient(cfg.Media.APIAddr)
	var proc *mtx.Process
	if !cfg.Media.DisableManagedMTX {
		hosts := append([]string{}, cfg.Media.WebRTCHosts...)
		hosts = append(hosts, "127.0.0.1") // for the loopback demo publisher
		crt, keyf := tlsInfo.CertFile, tlsInfo.KeyFile
		if cfg.Media.RTMPSListen != "" && crt == "" {
			return errors.New("RTMPS needs a certificate file in config/secrets (tls.crt/tls.key); ACME certificates are not supported for RTMPS")
		}
		conf, err := mtx.Render(mtx.ConfInput{
			LogLevel: cfg.Media.LogLevel, HookURL: "http://" + cfg.Web.InternalAddr + "/internal/mtx-auth/" + hookSecret,
			APIAddr: cfg.Media.APIAddr, WebRTCHTTPAddr: cfg.Media.WebRTCHTTPAddr, WebRTCUDPAddr: cfg.Media.WebRTCUDPAddr,
			WebRTCTCPAddr: cfg.Media.WebRTCTCPAddr, WebRTCHosts: hosts, WebRTCIfaces: cfg.Media.WebRTCInterfaces,
			RTMPAddr: cfg.Media.RTMPListen, RTMPSAddr: cfg.Media.RTMPSListen, TLSCert: crt, TLSKey: keyf,
		})
		if err != nil {
			return err
		}
		confPath := filepath.Join(L.RuntimeDir, "mediamtx.yml")
		if err := os.WriteFile(confPath, conf, 0o600); err != nil {
			return err
		}
		mlog, err := logx.NewRotating(filepath.Join(L.LogDir, "mediamtx.log"), cfg.Logging.MaxSizeMB, cfg.Logging.Keep)
		if err != nil {
			return err
		}
		defer mlog.Close()
		bin := cfg.Media.Binary
		if bin == "" {
			exe, _ := os.Executable()
			bin = filepath.Join(filepath.Dir(exe), "mediamtx", "mediamtx.exe")
		}
		proc = &mtx.Process{Binary: bin, ConfPath: confPath, Output: &logx.MaskWriter{W: mlog, M: masker}, Log: log, API: api}
	}

	mgr := media.NewManager(svc, api, "http://"+cfg.Media.WebRTCHTTPAddr, time.Duration(cfg.Media.ReconcileMillis)*time.Millisecond, log)
	hub := web.NewHub()
	svc.Events = hub

	// Register path-mode keys with the masker so they never reach logs.
	if streams, err := svc.ListStreams(ctx); err == nil {
		for _, s := range streams {
			if k, err := svc.StreamKeyInternal(s); err == nil && k != "" {
				masker.Add(k)
			}
		}
	}

	// Internal (loopback) server: MediaMTX hook + local control.
	imux := http.NewServeMux()
	imux.Handle("/internal/mtx-auth/", mgr.HookHandler(hookSecret))
	var stopOnce sync.Once
	imux.HandleFunc("/internal/ctl/", func(w http.ResponseWriter, r *http.Request) {
		rest := strings.TrimPrefix(r.URL.Path, "/internal/ctl/")
		cmd, tok, _ := strings.Cut(rest, "/")
		if !secure.Equal([]byte(tok), []byte(ctlToken)) {
			http.Error(w, "forbidden", 403)
			return
		}
		switch cmd {
		case "status":
			sys, _ := svc.State(r.Context())
			pid := 0
			if proc != nil {
				pid = proc.PID()
			}
			writeJSON(w, map[string]any{"version": Version, "auth": mgr.Healthy(), "media": mgr.MediaUp(), "mediamtxPid": pid,
				"lastReconcile": mgr.LastPass(), "state": sys, "pid": os.Getpid()})
		case "stop":
			writeJSON(w, map[string]any{"stopping": true})
			stopOnce.Do(func() { go func() { time.Sleep(200 * time.Millisecond); cancel() }() })
		default:
			http.NotFound(w, r)
		}
	})
	isrv := &http.Server{Handler: imux, ReadHeaderTimeout: 5 * time.Second}
	go isrv.Serve(internalLn)
	defer isrv.Close()

	if proc != nil {
		if err := proc.Start(ctx); err != nil {
			return err
		}
		defer proc.Stop()
	}

	var turn *turnsrv.Server
	if cfg.TURN.Mode == "builtin" {
		turn, err = turnsrv.Start(turnsrv.Config{Listen: cfg.TURN.Listen, PublicIP: cfg.TURN.PublicIP, Realm: cfg.TURN.Realm, Secret: turnSecret,
			MinPort: cfg.TURN.RelayMin, MaxPort: cfg.TURN.RelayMax}, log)
		if err != nil {
			return fmt.Errorf("built-in TURN: %w", err)
		}
		defer turn.Close()
	}

	hooks := web.Hooks{
		CheckSetupToken:   setup.check,
		ConsumeSetupToken: setup.consume,
		TURNSecret:        turnSecret,
		Backup: func(c context.Context, pass string) (string, error) {
			name := "dronstream-" + time.Now().Format("20060102-150405") + ".dsbak"
			return name, CreateBackup(c, L, st, key, pass, filepath.Join(L.BackupDir, name), false)
		},
		ListBackups: func() ([]map[string]any, error) { return listBackups(L.BackupDir) },
		BackupPath: func(name string) (string, error) {
			if name != filepath.Base(name) || !strings.HasSuffix(name, ".dsbak") {
				return "", errors.New("bad name")
			}
			return filepath.Join(L.BackupDir, name), nil
		},
		SystemInfo: func() map[string]any {
			return map[string]any{
				"version": Version, "mediamtxVersion": mtx.PinnedVersion, "root": L.Root,
				"paths": map[string]string{"config": L.ConfigFile, "data": L.DataDir, "logs": L.LogDir, "secrets": L.SecretsDir},
				"tls":   tlsInfo,
				"web":   map[string]any{"listen": cfg.Web.Listen, "publicHosts": cfg.Web.PublicHosts, "redirectHttp": cfg.Web.RedirectHTTP},
				"media": map[string]any{"rtmp": cfg.Media.RTMPListen, "rtmps": cfg.Media.RTMPSListen, "publishHost": cfg.Media.PublishHost,
					"webrtcUdp": cfg.Media.WebRTCUDPAddr, "webrtcTcp": cfg.Media.WebRTCTCPAddr, "webrtcHosts": cfg.Media.WebRTCHosts,
					"leaseSeconds": cfg.Media.LeaseSeconds, "ticketTtlSeconds": cfg.Media.TicketTTLSeconds, "maxPerSubject": cfg.Media.MaxPerUser},
				"turn":     map[string]any{"mode": cfg.TURN.Mode, "urls": cfg.TURN.URLs, "publicIp": cfg.TURN.PublicIP, "credentialMinutes": cfg.TURN.CredMinutes},
				"security": map[string]any{"auditRetentionDays": cfg.Security.AuditRetainDays, "sessionHours": cfg.Security.SessionHours, "idleMinutes": cfg.Security.IdleMinutes},
				"recording": false, "telemetry": false,
			}
		},
	}
	srv := web.New(svc, mgr, hub, &cfg, log, webui.FS(), hooks)
	hs := &http.Server{
		Addr: cfg.Web.Listen, Handler: srv.Handler(), TLSConfig: tlsCfg,
		ReadHeaderTimeout: 10 * time.Second, IdleTimeout: 120 * time.Second,
		ErrorLog: slog.NewLogLogger(log.Handler(), slog.LevelWarn),
	}
	errCh := make(chan error, 2)
	go func() {
		ln, err := net.Listen("tcp", cfg.Web.Listen)
		if err != nil {
			errCh <- fmt.Errorf("HTTPS listen %s: %w", cfg.Web.Listen, err)
			return
		}
		errCh <- hs.Serve(tls.NewListener(ln, tlsCfg))
	}()
	defer hs.Close()
	if cfg.Web.RedirectHTTP != "" {
		var h http.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			host, _, err := net.SplitHostPort(r.Host)
			if err != nil {
				host = r.Host
			}
			_, port, _ := net.SplitHostPort(cfg.Web.Listen)
			target := "https://" + host
			if port != "" && port != "443" {
				target += ":" + port
			}
			http.Redirect(w, r, target+"/", http.StatusMovedPermanently)
		})
		if acme != nil {
			h = acme.HTTPHandler(h)
		}
		rs := &http.Server{Addr: cfg.Web.RedirectHTTP, Handler: h, ReadHeaderTimeout: 5 * time.Second}
		go func() {
			if err := rs.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
				log.Error("http redirect listener", "err", err)
			}
		}()
		defer rs.Close()
	}

	go mgr.Run(ctx)
	if cfg.Demo.Enabled && proc != nil {
		startDemos(ctx, svc, cfg, masker, log)
	}
	log.Info("DronStream ready", "https", cfg.Web.Listen, "tls", tlsInfo.Mode)
	if opt.Console {
		fmt.Printf("\nDronStream %s ishga tushdi: https://localhost%s\n", Version, portSuffix(cfg.Web.Listen))
	}
	select {
	case <-ctx.Done():
		log.Info("shutting down")
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server error", "err", err)
			return err
		}
	}
	sctx, scancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer scancel()
	hs.Shutdown(sctx)
	return nil
}

func portSuffix(listen string) string {
	_, p, _ := net.SplitHostPort(listen)
	if p == "" || p == "443" {
		return ""
	}
	return ":" + p
}

func startDemos(ctx context.Context, svc *core.Service, cfg config.Config, masker *logx.Masker, log *slog.Logger) {
	seeded, _ := svc.St.Setting(ctx, "demo_seeded")
	if seeded != "1" {
		for i, n := range []string{"A", "B"} {
			_, _, err := svc.CreateStream(ctx, core.System, core.StreamInput{
				Name: "DEMO manba " + n + " (test tasvir)", Slug: "demo-" + strings.ToLower(n),
				Description: "Haqiqiy pult emas: o'rnatilgan test tasviri. Statistikasi ham shu test oqimiga tegishli.",
			}, true)
			if err != nil {
				log.Warn("demo stream create", "i", i, "err", err)
			}
		}
		svc.St.SetSetting(ctx, "demo_seeded", "1")
	}
	streams, err := svc.ListStreams(ctx)
	if err != nil {
		return
	}
	i := 0
	for _, s := range streams {
		if !s.IsDemo {
			continue
		}
		id := s.ID
		clip := demo.Clip(i)
		i++
		go demo.Run(ctx, demo.Source{Name: s.Slug, Clip: clip, Target: func(c context.Context) (string, string, error) {
			st, err := svc.GetStream(c, id)
			if err != nil {
				return "", "", err
			}
			if !st.PublishEnabled || !st.HasKey {
				return "", "", errors.New("demo stream publishing disabled or key revoked")
			}
			k, err := svc.StreamKeyInternal(st)
			if err != nil {
				return "", "", err
			}
			masker.Add(k)
			p, err := svc.MediaPath(st)
			if err != nil {
				return "", "", err
			}
			return "http://" + cfg.Media.WebRTCHTTPAddr + "/" + p + "/whip", k, nil
		}}, log)
	}
}

// ---- setup token ----

type setupToken struct {
	mu   sync.Mutex
	tok  string
	path string
}

func newSetupToken(L config.Layout, svc *core.Service, log *slog.Logger, console bool) *setupToken {
	s := &setupToken{path: filepath.Join(L.RuntimeDir, "setup-token.txt")}
	need, _ := svc.SetupNeeded(context.Background())
	if !need {
		os.Remove(s.path)
		return s
	}
	s.tok = secure.KeyToken(20)
	os.WriteFile(s.path, []byte(s.tok+"\r\n"), 0o600)
	log.Warn("no administrator yet: open the web UI and use the one-time setup code from data/runtime/setup-token.txt")
	if console {
		fmt.Printf("\n=== Birinchi ishga tushirish ===\nBir martalik o'rnatish kodi: %s\n(fayl: %s)\n\n", s.tok, s.path)
	}
	return s
}

func (s *setupToken) check(t string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.tok != "" && secure.Equal([]byte(t), []byte(s.tok))
}

func (s *setupToken) consume() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tok = ""
	os.Remove(s.path)
}

func loadOrCreateSecret(p string) (string, error) {
	b, err := os.ReadFile(p)
	if err == nil && len(strings.TrimSpace(string(b))) >= 16 {
		return strings.TrimSpace(string(b)), nil
	}
	s := secure.Token(32)
	return s, os.WriteFile(p, []byte(s), 0o600)
}

func listBackups(dir string) ([]map[string]any, error) {
	ents, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	out := []map[string]any{}
	for _, e := range ents {
		if !strings.HasSuffix(e.Name(), ".dsbak") {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		out = append(out, map[string]any{"name": e.Name(), "size": info.Size(), "modified": info.ModTime().UnixMilli()})
	}
	sort.Slice(out, func(i, j int) bool { return out[i]["modified"].(int64) > out[j]["modified"].(int64) })
	return out, nil
}

// CreateBackup snapshots the DB consistently and writes an encrypted archive.
func CreateBackup(ctx context.Context, L config.Layout, st *store.Store, masterKey []byte, pass, out string, migration bool) error {
	tmp := filepath.Join(L.RuntimeDir, fmt.Sprintf("snapshot-%d.db", time.Now().UnixNano()))
	defer os.Remove(tmp)
	if err := st.Snapshot(ctx, tmp); err != nil {
		return fmt.Errorf("snapshot: %w", err)
	}
	inst, _ := st.Setting(ctx, "instance_id")
	m := backup.Manifest{Format: 1, AppVersion: Version, SchemaVersion: store.SchemaVersion, CreatedAt: time.Now().UTC(),
		Hostname: backup.Hostname(), InstanceID: inst, OS: backup.OS(), ForMigration: migration}
	return backup.Create(out, pass, m, []backup.File{
		{Name: "dronstream.db", Path: tmp},
		{Name: "master.key", Data: masterKey},
		{Name: "dronstream.yaml", Path: L.ConfigFile},
		{Name: "tls.crt", Path: filepath.Join(L.SecretsDir, "tls.crt")},
		{Name: "tls.key", Path: filepath.Join(L.SecretsDir, "tls.key")},
		{Name: "turn.secret", Path: filepath.Join(L.SecretsDir, "turn.secret")},
	})
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	jsonEnc(w, v)
}
