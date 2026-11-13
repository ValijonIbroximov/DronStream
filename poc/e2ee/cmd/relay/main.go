// Command relay runs the keyless relay on 127.0.0.1.
//
//	relay [-port 59320] [-viewer-origins http://127.0.0.1:59321,http://localhost:59321] [-attack-hooks]
//
// It forwards opaque bytes only (see internal/relay). With -attack-hooks it
// additionally exposes operator-only endpoints that make it misbehave on
// purpose, to show how viewers and the source react (see attack.go).
package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"dronstream-poc-e2ee/internal/local"
	"dronstream-poc-e2ee/internal/relay"
)

func main() {
	port := flag.Int("port", 59320, "loopback port to listen on")
	origins := flag.String("viewer-origins", "http://127.0.0.1:59321,http://localhost:59321",
		"comma separated web origins that may call the relay from a browser (CORS)")
	attacks := flag.Bool("attack-hooks", false, "enable the malicious-relay simulation under /attack/ (demo only)")
	flag.Parse()

	r := relay.New(relay.Options{AllowedOrigins: strings.Split(*origins, ","), AttackHooks: *attacks})
	mux := http.NewServeMux()
	mux.Handle("/", r)
	if *attacks {
		mux.Handle("POST /attack/{what}", local.Guard(attackHandler(r)))
	}

	l, err := local.Listen(*port)
	if err != nil {
		log.Fatalf("relay: %v", err)
	}
	fmt.Printf("LISTEN %s\n", local.URL(l))
	log.Printf("keyless relay on %s (CORS for %s, attack hooks: %v)", local.URL(l), *origins, *attacks)
	srv := &http.Server{Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	log.Fatal(srv.Serve(l))
}
