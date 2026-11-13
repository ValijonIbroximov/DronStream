// Command dronstream is the DronStream server and its maintenance CLI.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"dronstream/internal/app"
	"dronstream/internal/config"
	"dronstream/internal/mtx"
)

var version = "dev"

const usage = `DronStream %s (MediaMTX %s)

Foydalanish:
  dronstream run       [--root DIR]            serverni ishga tushirish (konsol yoki Windows service)
  dronstream status    [--root DIR]            holat (0 = sog'lom)
  dronstream stop      [--root DIR]            to'xtatish
  dronstream backup    [--root DIR] [--out FILE] --passphrase-file F [--migrate-out]
  dronstream restore   [--root DIR] --in FILE --passphrase-file F [--force]
  dronstream activate  [--root DIR]            standby/migrated -> active
  dronstream reset-admin [--root DIR] --username NAME
  dronstream check     [--root DIR] [--json]   tayyorlik tekshiruvi (0=tayyor, 3=Tayyorla tuzatadi, 4=qo'lda)
  dronstream version
`

func main() {
	app.Version = version
	if len(os.Args) < 2 {
		fmt.Printf(usage, version, mtx.PinnedVersion)
		os.Exit(2)
	}
	cmd := os.Args[1]
	fs := flag.NewFlagSet(cmd, flag.ExitOnError)
	root := fs.String("root", "", "DronStream root directory")
	out := fs.String("out", "", "output file")
	in := fs.String("in", "", "input file")
	passFile := fs.String("passphrase-file", "", "file containing the backup passphrase")
	migrate := fs.Bool("migrate-out", false, "after backup, switch this server to 'migrated' (stops serving)")
	force := fs.Bool("force", false, "replace existing database")
	username := fs.String("username", "", "admin username")
	asJSON := fs.Bool("json", false, "JSON output")
	fs.Parse(os.Args[2:])
	r, err := config.ResolveRoot(*root)
	if err != nil {
		fail(err)
	}
	switch cmd {
	case "run":
		if isService() {
			if err := runService(r); err != nil {
				fail(err)
			}
			return
		}
		// SIGTERM is what systemd (and "kill") send; Ctrl+C is os.Interrupt.
		ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
		defer stop()
		if err := app.Run(ctx, app.Options{Root: r, Console: true}); err != nil {
			fail(err)
		}
	case "status":
		if err := app.Status(r); err != nil {
			fail(err)
		}
	case "stop":
		if err := app.Stop(r); err != nil {
			fail(err)
		}
	case "backup":
		p, err := app.ReadPassphrase(*passFile)
		if err != nil {
			fail(err)
		}
		if err := app.BackupCLI(r, *out, p, *migrate); err != nil {
			fail(err)
		}
	case "restore":
		p, err := app.ReadPassphrase(*passFile)
		if err != nil {
			fail(err)
		}
		if err := app.RestoreCLI(r, *in, p, *force); err != nil {
			fail(err)
		}
	case "activate":
		if err := app.Activate(r); err != nil {
			fail(err)
		}
	case "reset-admin":
		if err := app.ResetAdmin(r, *username); err != nil {
			fail(err)
		}
	case "check":
		os.Exit(app.CheckCLI(r, *asJSON))
	case "version":
		fmt.Println(version, "mediamtx", mtx.PinnedVersion)
	default:
		fmt.Printf(usage, version, mtx.PinnedVersion)
		os.Exit(2)
	}
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "XATO:", err)
	os.Exit(1)
}
