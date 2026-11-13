package main

// Malicious-relay simulation for demos (only with -attack-hooks). A relay
// that behaves correctly has no key at all; the key pair generated below is
// the ATTACKER's own key, used to show the key-substitution attack.
//
//	POST /attack/tamper?n=3      corrupt the next 3 frames
//	POST /attack/replay?n=1      resend an old frame after the next frame
//	POST /attack/substitute-on   show the relay's own public key in every join request
//	POST /attack/substitute-off

import (
	"crypto/ecdh"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"dronstream-poc-e2ee/internal/relay"
)

// groups prints a SHA-256 value in the same "abcd ef01 ..." form the source
// and the viewer use for fingerprints.
func groups(sum [sha256.Size]byte) string {
	out := make([]string, 0, 16)
	for i := 0; i < len(sum); i += 2 {
		out = append(out, fmt.Sprintf("%x", sum[i:i+2]))
	}
	return strings.Join(out, " ")
}

func attackHandler(r *relay.Relay) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		n, err := strconv.Atoi(req.URL.Query().Get("n"))
		if err != nil || n < 1 || n > 1000 {
			n = 1
		}
		var msg string
		switch req.PathValue("what") {
		case "tamper":
			err, msg = r.AttackTamper(n), fmt.Sprintf("the next %d frame(s) will be corrupted", n)
		case "replay":
			err, msg = r.AttackReplay(n), fmt.Sprintf("an old frame will be resent after each of the next %d frame(s)", n)
		case "substitute-on":
			var key *ecdh.PrivateKey
			if key, err = ecdh.P256().GenerateKey(rand.Reader); err == nil {
				pub := key.PublicKey().Bytes()
				err, msg = r.AttackSubstituteJoinKey(pub), fmt.Sprintf(
					"join requests now carry the relay's own key, fingerprint %s", groups(sha256.Sum256(pub)))
			}
		case "substitute-off":
			err, msg = r.AttackSubstituteJoinKey(nil), "join requests carry the viewers' real keys again"
		default:
			http.NotFound(w, req)
			return
		}
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		log.Printf("ATTACK SIMULATION: %s", msg)
		fmt.Fprintln(w, "attack simulation: "+msg)
	})
}
