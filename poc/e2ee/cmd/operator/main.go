// Command operator sends one operator command to a running source through
// its loopback control endpoint, for shells where typing into the source's
// own terminal is not possible.
//
//	operator [-control http://127.0.0.1:59322] list
//	operator approve <fingerprint>
//	operator revoke <fingerprint>
//	operator rotate | status | help
//
// With a relay started with -attack-hooks it can also trigger the
// malicious-relay simulation:
//
//	operator [-relay http://127.0.0.1:59320] attack tamper [n]
//	operator attack replay [n]
//	operator attack substitute-on | substitute-off
package main

import (
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"dronstream-poc-e2ee/internal/local"
)

func main() {
	control := flag.String("control", "http://127.0.0.1:59322", "control endpoint of the source")
	relay := flag.String("relay", "http://127.0.0.1:59320", "relay base URL (only for: attack ...)")
	flag.Parse()
	args := flag.Args()
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "usage: operator [-control URL] list | approve <fingerprint> | revoke <fingerprint> | rotate | status | help")
		fmt.Fprintln(os.Stderr, "       operator [-relay URL] attack tamper [n] | replay [n] | substitute-on | substitute-off")
		os.Exit(2)
	}

	target, body := strings.TrimRight(*control, "/")+"/cmd", strings.Join(args, " ")
	if args[0] == "attack" {
		if len(args) < 2 {
			fmt.Fprintln(os.Stderr, "operator: attack needs: tamper [n] | replay [n] | substitute-on | substitute-off")
			os.Exit(2)
		}
		target, body = strings.TrimRight(*relay, "/")+"/attack/"+url.PathEscape(args[1]), ""
		if len(args) > 2 {
			target += "?n=" + url.QueryEscape(args[2])
		}
	}
	req, err := http.NewRequest(http.MethodPost, target, strings.NewReader(body))
	if err != nil {
		fmt.Fprintln(os.Stderr, "operator:", err)
		os.Exit(1)
	}
	req.Header.Set(local.OperatorHeader, "1")
	resp, err := (&http.Client{Timeout: 15 * time.Second}).Do(req)
	if err != nil {
		fmt.Fprintln(os.Stderr, "operator:", err)
		os.Exit(1)
	}
	defer resp.Body.Close()
	out, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	fmt.Print(string(out))
	if resp.StatusCode != http.StatusOK {
		fmt.Fprintln(os.Stderr, "operator: answered", resp.Status)
		os.Exit(1)
	}
	if strings.HasPrefix(string(out), "REFUSED") {
		os.Exit(3)
	}
}
