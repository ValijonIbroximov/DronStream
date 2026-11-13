package core

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func mkLink(t *testing.T, s *Service, in LinkInput) (*Link, string) {
	t.Helper()
	if in.Objects == nil {
		st, _ := mustStream(t, s, fmt.Sprintf("l%d", time.Now().UnixNano()%1e9))
		c, _ := s.ContentForStream(context.Background(), st.ID)
		in.Objects = []GrantObject{{Type: "content", ID: c.ID}}
	}
	if in.SessionMinutes == 0 {
		in.SessionMinutes = 60
	}
	l, tok, err := s.CreateLink(context.Background(), admin, in)
	if err != nil {
		t.Fatal(err)
	}
	return l, tok
}

func uses(t *testing.T, s *Service, id int64) int64 {
	l, err := s.GetLink(context.Background(), id)
	if err != nil {
		t.Fatal(err)
	}
	return l.UsesCount
}

func TestLinkValidation(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	st, _ := mustStream(t, s, "v1")
	c, _ := s.ContentForStream(ctx, st.ID)
	objs := []GrantObject{{Type: "content", ID: c.ID}}
	bad := []LinkInput{
		{Name: "x", Preset: "once", Objects: objs},                                           // no session duration
		{Name: "x", Preset: "multi", SessionMinutes: 60, Objects: objs},                      // no N
		{Name: "x", Preset: "timed", SessionMinutes: 60, Objects: objs, MaxParallel: pi(2)},  // no window
		{Name: "x", Preset: "custom", SessionMinutes: 60, Objects: objs, MaxParallel: pi(2)}, // unbounded
		{Name: "x", Preset: "once", SessionMinutes: 60},                                      // no objects
	}
	for i, in := range bad {
		if _, _, err := s.CreateLink(ctx, admin, in); err == nil {
			t.Errorf("case %d accepted", i)
		}
	}
}

// approve is what the administrator does after comparing the code.
func approve(t *testing.T, s *Service, sess *Session) error {
	t.Helper()
	return s.ApproveLinkSession(context.Background(), admin, sess.ID, sess.VerifyCode)
}

func errCode(err error) string {
	if e, ok := err.(*Error); ok {
		return e.Code
	}
	return fmt.Sprint(err)
}

// A link is only an invitation: activation creates a PENDING request that
// grants nothing; requests are capped; the one-time use is spent only by the
// administrator's approval, and only once even under concurrency.
func TestOneTimeLinkRequestsAndSingleApproval(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	st, _ := mustStream(t, s, "once1")
	c, _ := s.ContentForStream(ctx, st.ID)
	l, tok := mkLink(t, s, LinkInput{Name: "Bir martalik", Preset: "once", Objects: []GrantObject{{Type: "content", ID: c.ID}}})
	var okN atomic.Int64
	var mu sync.Mutex
	var sessions []*Session
	var wg sync.WaitGroup
	for i := 0; i < 30; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			if _, se, _, err := s.ActivateLink(ctx, tok, fmt.Sprintf("req-browser-%04d-xx", i), "1.1.1.1", "ua"); err == nil {
				okN.Add(1)
				mu.Lock()
				sessions = append(sessions, se)
				mu.Unlock()
			}
		}(i)
	}
	wg.Wait()
	if okN.Load() != MaxPendingPerLink || uses(t, s, l.ID) != 0 {
		t.Fatalf("requests: %d pending (want %d), uses=%d (want 0)", okN.Load(), MaxPendingPerLink, uses(t, s, l.ID))
	}
	// a pending request gives nothing: no ticket, no library entry
	if _, err := s.IssueTicket(ctx, sessions[0], st.ID, "t", ""); err == nil || errCode(err) != "link_pending_approval" {
		t.Fatalf("pending session got a ticket: %v", err)
	}
	// the approval must name the code the visitor sees
	if err := s.ApproveLinkSession(ctx, admin, sessions[0].ID, "AAA-AAA"); errCode(err) != "verify_code_mismatch" {
		t.Fatalf("wrong code approved: %v", err)
	}
	// two administrators approve two different requests at the same time: one wins
	var won atomic.Int64
	for _, se := range sessions[:2] {
		wg.Add(1)
		go func(se *Session) {
			defer wg.Done()
			if approve(t, s, se) == nil {
				won.Add(1)
			}
		}(se)
	}
	wg.Wait()
	if won.Load() != 1 || uses(t, s, l.ID) != 1 {
		t.Fatalf("one-time link approved %d times, uses=%d", won.Load(), uses(t, s, l.ID))
	}
	if err := approve(t, s, sessions[2]); errCode(err) != "link_used_up" {
		t.Fatalf("third approval: %v", err)
	}
	// another browser later cannot even ask any more
	if _, _, _, err := s.ActivateLink(ctx, tok, "req-other-browser-0001", "2.2.2.2", "ua2"); errCode(err) != "link_used_up" {
		t.Fatalf("other browser: %v", err)
	}
}

func TestActivationRetryIsIdempotent(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	l, tok := mkLink(t, s, LinkInput{Name: "Retry", Preset: "once"})
	c1, s1, retried, err := s.ActivateLink(ctx, tok, "same-request-id-123456", "1.1.1.1", "ua")
	if err != nil || retried {
		t.Fatal(err)
	}
	// network lost the response; the browser re-sends the same POST
	c2, s2, retried, err := s.ActivateLink(ctx, tok, "same-request-id-123456", "1.1.1.1", "ua")
	if err != nil || !retried || s2.ID == s1.ID {
		t.Fatalf("retry: %v %v", err, retried)
	}
	if _, err := s.SessionByToken(ctx, c1); err == nil {
		t.Fatal("superseded session still valid")
	}
	sess, err := s.SessionByToken(ctx, c2)
	if err != nil || sess.Kind != "link" || sess.Approval != "pending" || sess.VerifyCode == "" {
		t.Fatalf("new session: %+v %v", sess, err)
	}
	if err := approve(t, s, sess); err != nil {
		t.Fatal(err)
	}
	// refresh / extra tab / media reconnect = same cookie, no consumption
	for i := 0; i < 5; i++ {
		s.SessionByToken(ctx, c2)
	}
	if uses(t, s, l.ID) != 1 {
		t.Fatal("refresh consumed a use")
	}
	if err := approve(t, s, sess); errCode(err) != "approval_not_pending" {
		t.Fatalf("double approval: %v", err)
	}
}

func TestMultiLinkLimitUnderConcurrentApprovals(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	l, tok := mkLink(t, s, LinkInput{Name: "3 marta", Preset: "multi", MaxUses: pi(3), MaxParallel: pi(10)})
	var sessions []*Session
	for i := 0; i < MaxPendingPerLink; i++ {
		_, se, _, err := s.ActivateLink(ctx, tok, fmt.Sprintf("multi-request-%04d", i), "1.1.1.1", "ua")
		if err != nil {
			t.Fatal(err)
		}
		sessions = append(sessions, se)
	}
	var okN atomic.Int64
	var wg sync.WaitGroup
	for _, se := range sessions {
		wg.Add(1)
		go func(se *Session) {
			defer wg.Done()
			if approve(t, s, se) == nil {
				okN.Add(1)
			}
		}(se)
	}
	wg.Wait()
	if okN.Load() != 3 || uses(t, s, l.ID) != 3 {
		t.Fatalf("N=3: %d approved, uses=%d", okN.Load(), uses(t, s, l.ID))
	}
}

func TestParallelSessionLimit(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	l, tok := mkLink(t, s, LinkInput{Name: "p", Preset: "multi", MaxUses: pi(10), MaxParallel: pi(2)})
	var ss []*Session
	for i := 1; i <= 3; i++ {
		_, se, _, err := s.ActivateLink(ctx, tok, fmt.Sprintf("parallel-request-%04d", i), "", "")
		if err != nil {
			t.Fatal(err)
		}
		ss = append(ss, se)
	}
	if approve(t, s, ss[0]) != nil || approve(t, s, ss[1]) != nil {
		t.Fatal("first two approvals")
	}
	if err := approve(t, s, ss[2]); errCode(err) != "link_parallel_limit" {
		t.Fatalf("parallel: %v", err)
	}
	// admin ends one session -> the waiting one can be approved
	s.RevokeSession(ctx, admin, ss[0].ID)
	if err := approve(t, s, ss[2]); err != nil {
		t.Fatal(err)
	}
	if uses(t, s, l.ID) != 3 {
		t.Fatal("uses")
	}
}

func TestRejectedLinkRequestStaysClosed(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	st, _ := mustStream(t, s, "rej")
	c, _ := s.ContentForStream(ctx, st.ID)
	_, tok := mkLink(t, s, LinkInput{Name: "r", Preset: "multi", MaxUses: pi(3), MaxParallel: pi(3), Objects: []GrantObject{{Type: "content", ID: c.ID}}})
	_, se, _, _ := s.ActivateLink(ctx, tok, "reject-request-00001", "", "")
	if err := s.RejectLinkSession(ctx, admin, se.ID); err != nil {
		t.Fatal(err)
	}
	if err := approve(t, s, se); errCode(err) != "approval_not_pending" {
		t.Fatalf("rejected session approved: %v", err)
	}
	if _, err := s.IssueTicket(ctx, se, st.ID, "t", ""); errCode(err) != "link_rejected" {
		t.Fatalf("rejected session: %v", err)
	}
}

func TestTimedLinkWindow(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	now := time.Now()
	start, end := now.Add(time.Hour).UnixMilli(), now.Add(2*time.Hour).UnixMilli()
	_, tok := mkLink(t, s, LinkInput{Name: "t", Preset: "timed", StartsAt: &start, EndsAt: &end, MaxParallel: pi(5)})
	if _, _, _, err := s.ActivateLink(ctx, tok, "timed-request-000001", "", ""); err == nil || err.(*Error).Code != "link_not_started" {
		t.Fatalf("before start: %v", err)
	}
	s.Now = func() time.Time { return time.UnixMilli(start + 1000) }
	cookie, sess, _, err := s.ActivateLink(ctx, tok, "timed-request-000002", "", "")
	if err != nil {
		t.Fatal(err)
	}
	if sess.ExpiresAt > end {
		t.Fatal("session outlives link window")
	}
	s.Now = func() time.Time { return time.UnixMilli(end + 1) }
	if _, _, _, err := s.ActivateLink(ctx, tok, "timed-request-000003", "", ""); err == nil || err.(*Error).Code != "link_expired" {
		t.Fatalf("after end: %v", err)
	}
	if _, err := s.SessionByToken(ctx, cookie); err == nil {
		t.Fatal("session alive after window end")
	}
}

func TestLinkRevokeCutsSessionsAndMedia(t *testing.T) {
	s, f := newSvc(t)
	ctx := context.Background()
	st, _ := mustStream(t, s, "rv")
	c, _ := s.ContentForStream(ctx, st.ID)
	l, tok := mkLink(t, s, LinkInput{Name: "r", Preset: "multi", MaxUses: pi(5), MaxParallel: pi(5), Objects: []GrantObject{{Type: "content", ID: c.ID}}})
	_, sess, _, err := s.ActivateLink(ctx, tok, "revoke-request-00001", "", "")
	if err != nil {
		t.Fatal(err)
	}
	if err := approve(t, s, sess); err != nil {
		t.Fatal(err)
	}
	if err := connect(t, s, sess, st, "lk1"); err != nil {
		t.Fatal(err)
	}
	if err := s.RevokeLink(ctx, admin, l.ID); err != nil {
		t.Fatal(err)
	}
	if f.kicks["lk1"] == "" {
		t.Fatal("link media not cut")
	}
	if _, _, _, err := s.ActivateLink(ctx, tok, "revoke-request-00002", "", ""); err == nil {
		t.Fatal("revoked link activated")
	}
}

func TestRegenerateInvalidatesOldToken(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	l, old := mkLink(t, s, LinkInput{Name: "g", Preset: "multi", MaxUses: pi(5), MaxParallel: pi(5)})
	nw, err := s.RegenerateLink(ctx, admin, l.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	if _, _, _, err := s.ActivateLink(ctx, old, "regen-request-000001", "", ""); err == nil {
		t.Fatal("old token works")
	}
	if _, _, _, err := s.ActivateLink(ctx, nw, "regen-request-000002", "", ""); err != nil {
		t.Fatal(err)
	}
	got, _ := s.LinkToken(mustGetLink(t, s, l.ID))
	if got != nw {
		t.Fatal("stored token not updated")
	}
}

func mustGetLink(t *testing.T, s *Service, id int64) *Link {
	l, err := s.GetLink(context.Background(), id)
	if err != nil {
		t.Fatal(err)
	}
	return l
}

func TestLinkEmergencyAndBlockedUser(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	uid, _, _ := mustUser(t, s, "bound", "user")
	l, tok := mkLink(t, s, LinkInput{Name: "b", Preset: "multi", MaxUses: pi(5), MaxParallel: pi(5), ForUserID: &uid})
	s.SetEmergencyStop(ctx, admin, true)
	if _, _, _, err := s.ActivateLink(ctx, tok, "emerg-request-000001", "", ""); err == nil {
		t.Fatal("activation during emergency stop")
	}
	if uses(t, s, l.ID) != 0 {
		t.Fatal("denied activation consumed a use")
	}
	s.SetEmergencyStop(ctx, admin, false)
	s.SetUserBlocked(ctx, admin, uid, true)
	if _, _, _, err := s.ActivateLink(ctx, tok, "emerg-request-000002", "", ""); err == nil {
		t.Fatal("link of blocked account activated")
	}
}

func TestInspectDoesNotConsume(t *testing.T) {
	s, _ := newSvc(t)
	l, tok := mkLink(t, s, LinkInput{Name: "i", Preset: "once"})
	for i := 0; i < 5; i++ {
		info, err := s.InspectLink(context.Background(), tok)
		if err != nil || info.Status != "active" {
			t.Fatal(err)
		}
	}
	if uses(t, s, l.ID) != 0 {
		t.Fatal("inspect consumed")
	}
	if _, err := s.InspectLink(context.Background(), "x"+tok[1:]); err == nil {
		t.Fatal("wrong token inspected")
	}
}

func TestCollectionPolicies(t *testing.T) {
	s, _ := newSvc(t)
	ctx := context.Background()
	uidDyn, sDyn, _ := mustUser(t, s, "dyn", "user")
	uidSnap, sSnap, _ := mustUser(t, s, "snap", "user")
	t1, _ := s.CreateText(ctx, admin, "E'lon 1", "", "matn 1")
	t2, _ := s.CreateText(ctx, admin, "E'lon 2", "", "matn 2")
	cid, err := s.SaveCollection(ctx, admin, 0, CollectionInput{Title: "Asosiy kuzatuv", Items: []CollectionItem{{ContentID: t1.ID}}})
	if err != nil {
		t.Fatal(err)
	}
	s.GrantObjects(ctx, admin, "user", []int64{uidDyn}, []GrantObject{{Type: "collection", ID: cid, IncludeFuture: true}}, nil)
	s.GrantObjects(ctx, admin, "user", []int64{uidSnap}, []GrantObject{{Type: "collection", ID: cid, IncludeFuture: false}}, nil)
	can := func(sess *Session, id int64) bool { return s.AuthorizeContent(ctx, sess.ID, id).OK }
	if !can(sDyn, t1.ID) || !can(sSnap, t1.ID) {
		t.Fatal("current item")
	}
	// add item later
	s.SaveCollection(ctx, admin, cid, CollectionInput{Title: "Asosiy kuzatuv", Items: []CollectionItem{{ContentID: t1.ID}, {ContentID: t2.ID}}})
	if !can(sDyn, t2.ID) {
		t.Fatal("dynamic grant must include new item")
	}
	if can(sSnap, t2.ID) {
		t.Fatal("snapshot grant must NOT include new item (no hidden extra rights)")
	}
	// remove item: dynamic loses it, snapshot keeps its own content grant
	s.SaveCollection(ctx, admin, cid, CollectionInput{Title: "Asosiy kuzatuv", Items: []CollectionItem{{ContentID: t2.ID}}})
	if can(sDyn, t1.ID) || !can(sSnap, t1.ID) {
		t.Fatal("removal semantics")
	}
	// hidden content denied for non-admin
	f := false
	s.UpdateContent(ctx, admin, t2.ID, ContentUpdate{Visible: &f})
	if can(sDyn, t2.ID) {
		t.Fatal("hidden content visible")
	}
	// library lists only accessible items
	items, cols, _ := s.Library(ctx, sSnap)
	if len(items) != 1 || items[0].ID != t1.ID || len(cols) != 0 {
		t.Fatalf("library: %d items %d cols", len(items), len(cols))
	}
	// preview equals library without consuming anything
	pv, _, _ := s.Preview(ctx, "user", uidSnap)
	if len(pv) != 1 {
		t.Fatalf("preview %v", pv)
	}
}

func TestMigrationKeepsAccountsAndPermissions(t *testing.T) {
	// covered with a real v1 database created by the 1.0.0 binary in
	// integration/migration_test.go; here: grants of legacy API map to content.
	s, _ := newSvc(t)
	ctx := context.Background()
	uid, sess, _ := mustUser(t, s, "legacy", "user")
	st, _ := mustStream(t, s, "leg")
	if err := s.Grant(ctx, admin, "user", uid, []int64{st.ID}, nil); err != nil {
		t.Fatal(err)
	}
	gs, _ := s.ListGrants(ctx, "user", uid)
	if len(gs) != 1 || gs[0].ObjectType != "content" || gs[0].ContentType != "stream" {
		t.Fatalf("%+v", gs)
	}
	if err := connect(t, s, sess, st, "lg"); err != nil {
		t.Fatal(err)
	}
}
