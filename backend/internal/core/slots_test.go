package core

import (
	"context"
	"errors"
	"testing"
)

// hook simulates the MediaMTX auth hook for a ticket.
func hook(s *Service, st *Stream, tk *Ticket, mtxID string) error {
	p, _ := s.MediaPath(st)
	_, err := s.HookRead(context.Background(), HookRequest{Action: "read", Protocol: "webrtc", Token: tk.Token, Path: p, Query: "ds=" + tk.nonce, ID: mtxID, IP: "10.0.0.1"})
	return err
}

func tooMany(err error) (scope string, ok bool) {
	var ce *Error
	if errors.As(err, &ce) && ce.Code == "too_many_sessions" {
		sc, _ := ce.Data["scope"].(string)
		return sc, true
	}
	return "", false
}

// A lease renewal opens a second session in the SAME slot for a moment. It
// must not be counted as another open video, otherwise a full grid would
// lose its renewals exactly when all tiles renew together.
func TestRenewalDoesNotCountAgainstSubjectLimit(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	s.Cfg.Media.MaxPerUser = 3
	uid, sess, _ := mustUser(t, s, "alice", "user")
	var streams []*Stream
	for _, slug := range []string{"c1", "c2", "c3", "c4"} {
		st, _ := mustStream(t, s, slug)
		streams = append(streams, st)
	}
	s.Grant(ctx, admin, "user", uid, []int64{streams[0].ID, streams[1].ID, streams[2].ID, streams[3].ID}, nil)
	// three tiles open: the limit is reached
	for i := 0; i < 3; i++ {
		tk, err := s.IssueTicket(ctx, sess, streams[i].ID, "tab-"+itoa(int64(i)), "")
		if err != nil {
			t.Fatalf("tile %d: %v", i, err)
		}
		if err := hook(s, streams[i], tk, "live-"+itoa(int64(i))); err != nil {
			t.Fatalf("tile %d hook: %v", i, err)
		}
	}
	// all three renew at the same time (make-before-break): must succeed
	for i := 0; i < 3; i++ {
		tk, err := s.IssueTicket(ctx, sess, streams[i].ID, "tab-"+itoa(int64(i)), "")
		if err != nil {
			t.Fatalf("renewal %d refused: %v", i, err)
		}
		if err := hook(s, streams[i], tk, "renew-"+itoa(int64(i))); err != nil {
			t.Fatalf("renewal %d hook refused: %v", i, err)
		}
	}
	// a fourth tile is a real overflow and says so with numbers
	_, err := s.IssueTicket(ctx, sess, streams[3].ID, "tab-3", "")
	scope, ok := tooMany(err)
	if !ok || scope != "subject" {
		t.Fatalf("fourth tile: want subject limit, got %v", err)
	}
	var ce *Error
	errors.As(err, &ce)
	if ce.Data["used"] != 3 || ce.Data["max"] != 3 {
		t.Fatalf("limit details wrong: %+v", ce.Data)
	}
}

// Outstanding (unused) tickets of a slot that is already open must not use
// up the subject limit either.
func TestUnusedTicketsOfSameSlotCountOnce(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	s.Cfg.Media.MaxPerUser = 2
	uid, sess, _ := mustUser(t, s, "bob", "user")
	a, _ := mustStream(t, s, "cam-a")
	b, _ := mustStream(t, s, "cam-b")
	s.Grant(ctx, admin, "user", uid, []int64{a.ID, b.ID}, nil)
	for i := 0; i < 5; i++ { // e.g. a tile that keeps retrying
		if _, err := s.IssueTicket(ctx, sess, a.ID, "t0", ""); err != nil {
			t.Fatalf("retry %d: %v", i, err)
		}
	}
	if _, err := s.IssueTicket(ctx, sess, b.ID, "t1", ""); err != nil {
		t.Fatalf("second tile refused although only one slot is in use: %v", err)
	}
}

// A slot never holds more than live + renewal; the refusal names the slot so
// the web layer can supersede stale connections of that same player.
func TestSlotLimitAndSupersedeInfo(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	uid, sess, _ := mustUser(t, s, "carol", "user")
	st, _ := mustStream(t, s, "cam")
	s.Grant(ctx, admin, "user", uid, []int64{st.ID}, nil)
	for i := 0; i < SlotSessionLimit; i++ {
		tk, err := s.IssueTicket(ctx, sess, st.ID, "tab", "")
		if err != nil {
			t.Fatal(err)
		}
		if err := hook(s, st, tk, "m"+itoa(int64(i))); err != nil {
			t.Fatal(err)
		}
	}
	_, err := s.IssueTicket(ctx, sess, st.ID, "tab", "")
	if scope, ok := tooMany(err); !ok || scope != "slot" {
		t.Fatalf("want slot limit, got %v", err)
	}
	list, err := s.SlotSessions(ctx, sess, st.ID, "tab")
	if err != nil || len(list) != SlotSessionLimit {
		t.Fatalf("slot sessions: %v %d", err, len(list))
	}
	if list[0].MtxID != "m1" {
		t.Fatalf("newest first expected, got %s", list[0].MtxID)
	}
	// ending the older one (what SupersedeSlot does) frees the slot
	s.EndMedia(ctx, list[1], "superseded")
	if _, err := s.IssueTicket(ctx, sess, st.ID, "tab", ""); err != nil {
		t.Fatalf("after supersede: %v", err)
	}
	// another tab of the same browser session is a different slot
	if _, err := s.IssueTicket(ctx, sess, st.ID, "other-tab", ""); err != nil {
		t.Fatalf("other tab: %v", err)
	}
}

// When MediaMTX refuses the read after the hook accepted it (source offline),
// the phantom pending session is dropped at once and does not block retries.
func TestOfflineRetriesDoNotAccumulate(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	uid, sess, _ := mustUser(t, s, "dave", "user")
	st, _ := mustStream(t, s, "off")
	s.Grant(ctx, admin, "user", uid, []int64{st.ID}, nil)
	for i := 0; i < 8; i++ {
		tk, err := s.IssueTicket(ctx, sess, st.ID, "tab", "")
		if err != nil {
			t.Fatalf("attempt %d refused: %v", i, err)
		}
		if err := hook(s, st, tk, "off-"+itoa(int64(i))); err != nil {
			t.Fatal(err)
		}
		s.DropPendingMedia(ctx, tk.nonce, "connect_failed") // what the WHEP proxy does on a 404
	}
	live, _ := s.LiveMediaSessions(ctx)
	if len(live) != 0 {
		t.Fatalf("phantom sessions left: %d", len(live))
	}
	// an established session is not touched by DropPendingMedia
	tk, _ := s.IssueTicket(ctx, sess, st.ID, "tab", "")
	hook(s, st, tk, "real")
	ms, _ := s.MediaByMtxID(ctx, "real")
	s.UpdateMediaStats(ctx, ms.ID, true, 10, "")
	s.DropPendingMedia(ctx, tk.nonce, "connect_failed")
	if live, _ := s.LiveMediaSessions(ctx); len(live) != 1 {
		t.Fatalf("active session was dropped")
	}
}
