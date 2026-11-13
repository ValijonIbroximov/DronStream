//go:build integration

package integration

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

type ticketErr struct {
	Code    string
	Message string
	Details struct {
		Scope string
		Used  int
		Max   int
	}
}

func (c *client) ticketFull(streamID int64, tab string) (string, int, ticketErr) {
	st, b := c.do("POST", fmt.Sprintf("/api/watch/%d/ticket", streamID), map[string]string{"tab": tab}, nil)
	var ok struct{ Ticket string }
	var e ticketErr
	json.Unmarshal(b, &ok)
	json.Unmarshal(b, &e)
	return ok.Ticket, st, e
}

// liveFor (admin only) counts the live media sessions of one user.
func (c *client) liveFor(subject string) int {
	var l struct {
		Live []struct {
			SubjectName string
			Status      string
		}
	}
	c.mustJSON("GET", "/api/admin/media", nil, &l)
	n := 0
	for _, m := range l.Live {
		if m.SubjectName == subject {
			n++
		}
	}
	return n
}

// TestPlayerSlots covers the "Juda ko'p ulanish" defect: an offline tile that
// keeps retrying, lease renewals of a full grid, page reloads that leave old
// sessions behind, and the message shown when the limit is really reached.
func TestPlayerSlots(t *testing.T) {
	maxPerSubject = 2
	defer func() { maxPerSubject = 12 }()
	bin := buildServer(t)
	root := t.TempDir()
	os.MkdirAll(filepath.Join(root, "config"), 0o700)
	os.WriteFile(filepath.Join(root, "config", "dronstream.yaml"), []byte(testConfig(120)), 0o600)
	srv := startServer(t, bin, root)
	defer func() { srv.stop(); saveResults(t) }()
	admin := newClient(t, "admin")
	tok, _ := os.ReadFile(filepath.Join(root, "data", "runtime", "setup-token.txt"))
	_, b := admin.do("POST", "/api/setup", map[string]string{"setupToken": strings.TrimSpace(string(tok)), "username": "boss", "password": "Correct-Horse-1"}, nil)
	admin.absorbSession(b)
	if !admin.waitOnline("demo-a", true, 20*time.Second) || !admin.waitOnline("demo-b", true, 20*time.Second) {
		t.Fatal("demo sources did not come online")
	}
	ss := admin.streams()
	demoA, demoB := ss["demo-a"].ID, ss["demo-b"].ID
	var cr struct {
		Stream stream
		Key    string
		URLs   map[string]string `json:"urls"`
	}
	admin.mustJSON("POST", "/api/admin/streams", map[string]string{"name": "Pult (efirda emas)", "slug": "pult-off"}, &cr)
	admin.mustJSON("POST", "/api/admin/users", map[string]string{"username": "vera", "password": "Vera-Password-123", "role": "user"}, nil)
	veraID := admin.userID("vera")
	admin.grant("user", veraID, []int64{demoA, demoB, cr.Stream.ID}, nil)
	vera := newClient(t, "vera")
	if st := vera.login("vera", "Vera-Password-123"); st != 200 {
		t.Fatalf("login %d", st)
	}

	// 1. An offline tile retries for a long time: always "offline", never the limit.
	for i := 0; i < 8; i++ {
		_, st, e := vera.ticketFull(cr.Stream.ID, "p-2")
		if st != 403 || e.Code != "stream_offline" {
			t.Fatalf("offline attempt %d: %d %+v", i, st, e)
		}
		time.Sleep(400 * time.Millisecond)
	}
	if n := admin.liveFor("vera"); n != 0 {
		t.Fatalf("offline retries left %d media sessions", n)
	}
	record("slots_offline_retries", "PASS (8 urinish: har biri stream_offline, sessiya qolmadi)")

	// 2. The source disappears between ticket and connect: MediaMTX answers
	//    404 after the hook has recorded the attempt. No phantom session may stay.
	pubr := ffmpegPublish(t, cr.URLs["rtmp"], "PULT")
	if !admin.waitOnline("pult-off", true, 15*time.Second) {
		pubr.kill()
		t.Fatalf("publisher did not come online: %s", pubr.out.String())
	}
	var tickets []string
	for i := 0; i < 3; i++ {
		tk, st, e := vera.ticketFull(cr.Stream.ID, "p-2")
		if st != 200 {
			t.Fatalf("ticket %d while online: %d %+v", i, st, e)
		}
		tickets = append(tickets, tk)
	}
	pubr.kill()
	if !admin.waitOnline("pult-off", false, 15*time.Second) {
		t.Fatal("stream still online after publisher was stopped")
	}
	for i, tk := range tickets {
		v, st, code := vera.watchWithTicket(cr.Stream.ID, tk)
		if v != nil {
			v.close()
			t.Fatalf("attempt %d connected to an offline stream", i)
		}
		if st != 403 || code != "stream_offline" {
			t.Fatalf("attempt %d: %d %s", i, st, code)
		}
	}
	if n := admin.liveFor("vera"); n != 0 {
		t.Fatalf("refused connections left %d phantom sessions", n)
	}
	record("slots_no_phantom_sessions", "PASS (hook qabul qilgan, MediaMTX 404 bergan 3 urinishdan sessiya qolmadi)")

	// 3. Two tiles play (limit = 2 tiles). Both renew at once: make-before-break
	//    doubles the sessions for a moment and must still be allowed.
	a1 := vera.watch(demoA, "p-0")
	b1 := vera.watch(demoB, "p-1")
	a2 := vera.watch(demoA, "p-0")
	b2 := vera.watch(demoB, "p-1")
	if !a1.stillFlowing(3*time.Second) || !b1.stillFlowing(3*time.Second) {
		t.Fatal("old sessions died during renewal overlap")
	}
	a1.close()
	b1.close()
	record("slots_renewal_at_limit", "PASS (chegara 2 joy: ikkala joy bir vaqtda yangilandi)")

	// 4. A third tile is a real overflow: refused with numbers and advice.
	_, st, e := vera.ticketFull(demoA, "p-9")
	if st != 429 || e.Code != "too_many_sessions" || e.Details.Scope != "subject" || e.Details.Used != 2 || e.Details.Max != 2 || !strings.Contains(e.Message, "2/2") {
		t.Fatalf("overflow answer: %d %+v", st, e)
	}
	record("slots_limit_message", "PASS (429, scope=subject, 2/2 va maslahat matni)")

	// 5. Page reloads: the same slot asks again while its old sessions are
	//    still registered. The newest request wins, older ones are closed.
	time.Sleep(1500 * time.Millisecond) // let a1/b1 be reconciled away
	a3 := vera.watch(demoA, "p-0")    // slot now holds a2 + a3
	a4 := vera.watch(demoA, "p-0")    // would be the third: a2 is superseded
	select {
	case <-a2.ended:
	case <-time.After(8 * time.Second):
		if a2.stillFlowing(2 * time.Second) {
			t.Fatal("superseded session still receives media")
		}
	}
	if !a4.stillFlowing(3*time.Second) || !a3.stillFlowing(3*time.Second) {
		t.Fatal("newest sessions of the slot were cut")
	}
	a5 := vera.watch(demoA, "p-0")
	if !a5.stillFlowing(3 * time.Second) {
		t.Fatal("reload #3 has no media")
	}
	if !b2.stillFlowing(3 * time.Second) {
		t.Fatal("another slot was affected by a reload")
	}
	record("slots_reload_supersede", "PASS (3 marta ketma-ket qayta yuklash: yangisi ulandi, eskisi uzildi, boshqa joy tegilmadi)")
	for _, v := range []*viewer{a2, a3, a4, a5, b2} {
		v.close()
	}

	// 6. After everything is closed the user can open tiles again.
	deadline := time.Now().Add(40 * time.Second)
	for admin.liveFor("vera") > 0 && time.Now().Before(deadline) {
		time.Sleep(500 * time.Millisecond)
	}
	if n := admin.liveFor("vera"); n != 0 {
		t.Fatalf("closed sessions were not cleaned up: %d left", n)
	}
	c1 := vera.watch(demoA, "q-0")
	defer c1.close()
	record("slots_cleanup_after_close", "PASS")
}
