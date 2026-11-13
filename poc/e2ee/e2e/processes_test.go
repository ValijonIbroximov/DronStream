package e2e

import (
	"bufio"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	"dronstream-poc-e2ee/internal/h264"
)

// proc is a child process started by the test. Only processes started here
// are ever stopped here.
type proc struct {
	name string
	cmd  *exec.Cmd
	mu   sync.Mutex
	out  []string
	line chan string
}

func startProc(t *testing.T, ctx context.Context, name, bin string, args ...string) *proc {
	t.Helper()
	p := &proc{name: name, cmd: exec.CommandContext(ctx, bin, args...), line: make(chan string, 4096)}
	stdout, err := p.cmd.StdoutPipe()
	if err != nil {
		t.Fatal(err)
	}
	p.cmd.Stderr = p.cmd.Stdout // one combined stream
	if err := p.cmd.Start(); err != nil {
		t.Fatalf("start %s: %v", name, err)
	}
	t.Cleanup(func() {
		p.cmd.Process.Kill()
		p.cmd.Wait()
	})
	go func() {
		sc := bufio.NewScanner(stdout)
		for sc.Scan() {
			p.mu.Lock()
			p.out = append(p.out, sc.Text())
			p.mu.Unlock()
			select {
			case p.line <- sc.Text():
			default:
			}
		}
		close(p.line)
	}()
	return p
}

// waitLine waits for an output line matching the pattern and returns its
// first capture group.
func (p *proc) waitLine(t *testing.T, pattern string) string {
	t.Helper()
	re := regexp.MustCompile(pattern)
	timeout := time.After(40 * time.Second)
	for {
		select {
		case line, ok := <-p.line:
			if !ok {
				t.Fatalf("%s exited before printing %q; output:\n%s", p.name, pattern, p.output())
			}
			if m := re.FindStringSubmatch(line); m != nil {
				return m[1]
			}
		case <-timeout:
			t.Fatalf("%s did not print %q in time; output:\n%s", p.name, pattern, p.output())
		}
	}
}

func (p *proc) output() string {
	p.mu.Lock()
	defer p.mu.Unlock()
	return strings.Join(p.out, "\n")
}

// Claim: the real programs work together as separate processes over real
// loopback HTTP: relay, source (with H.264 from ffmpeg when available), the
// operator tool, and the headless Go receiver. Covers approve, decrypt,
// revoke and the "revoked" state end to end. All ports are picked by the OS.
func TestRealProcessesChain(t *testing.T) {
	if testing.Short() {
		t.Skip("skipped with -short")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 150*time.Second)
	defer cancel()

	bin := t.TempDir()
	exe := func(name string) string {
		if runtime.GOOS == "windows" {
			name += ".exe"
		}
		return filepath.Join(bin, name)
	}
	build := exec.CommandContext(ctx, "go", "build", "-o", bin+string(os.PathSeparator),
		"./cmd/relay", "./cmd/source", "./cmd/receiver", "./cmd/operator")
	build.Dir = ".."
	if out, err := build.CombinedOutput(); err != nil {
		t.Fatalf("go build: %v\n%s", err, out)
	}

	relay := startProc(t, ctx, "relay", exe("relay"), "-port", "0")
	relayURL := relay.waitLine(t, `^LISTEN (http://127\.0\.0\.1:\d+)$`)

	sourceArgs := []string{"-relay", relayURL, "-stream", "proc-test", "-fps", "30", "-control-port", "0"}
	video := "synthetic frames (ffmpeg not found)"
	if ffmpeg := h264.FindFFmpeg(); ffmpeg != "" {
		sourceArgs = append(sourceArgs, "-ffmpeg", ffmpeg)
		video = "H.264 test pattern from ffmpeg"
	} else {
		sourceArgs = append(sourceArgs, "-synthetic")
	}
	source := startProc(t, ctx, "source", exe("source"), sourceArgs...)
	controlURL := source.waitLine(t, `^CONTROL (http://127\.0\.0\.1:\d+)$`)
	source.waitLine(t, `^(READY) `)

	operator := func(args ...string) string {
		out, _ := exec.CommandContext(ctx, exe("operator"), append([]string{"-control", controlURL}, args...)...).CombinedOutput()
		return string(out)
	}

	// Two receivers: one stays, one gets revoked.
	stays := startProc(t, ctx, "receiver-stays", exe("receiver"), "-relay", relayURL, "-stream", "proc-test",
		"-label", "stays", "-frames", "150", "-timeout", "90s")
	staysFP := stays.waitLine(t, `^FINGERPRINT ([0-9a-f ]{79})$`)
	leaves := startProc(t, ctx, "receiver-leaves", exe("receiver"), "-relay", relayURL, "-stream", "proc-test",
		"-label", "leaves", "-frames", "0", "-timeout", "90s")
	leavesFP := leaves.waitLine(t, `^FINGERPRINT ([0-9a-f ]{79})$`)

	if out := operator("list"); !strings.Contains(out, staysFP) || !strings.Contains(out, leavesFP) {
		t.Fatalf("operator list does not show both fingerprints exactly as the receivers print them:\n%s", out)
	}
	// A fingerprint nobody sent is refused.
	if out := operator("approve", strings.Repeat("0", 64)); !strings.HasPrefix(out, "REFUSED") {
		t.Fatalf("approving an unknown fingerprint: %s", out)
	}
	for _, fp := range []string{staysFP, leavesFP} {
		if out := operator("approve", fp); !strings.HasPrefix(out, "approved") {
			t.Fatalf("approve: %s", out)
		}
	}
	stays.waitLine(t, `^STATE (decrypting)$`)
	leaves.waitLine(t, `^STATE (decrypting)$`)

	if out := operator("revoke", leavesFP); !strings.HasPrefix(out, "revoked") || !strings.Contains(out, "epoch 2") {
		t.Fatalf("revoke: %s", out)
	}
	leaves.waitLine(t, `^STATE (revoked: no key for the current epoch)$`)

	// The remaining receiver must reach 150 decrypted frames across the epoch
	// change, with no failures, and exit with status 0.
	result := stays.waitLine(t, `^RESULT ok (.*)$`)
	if err := stays.cmd.Wait(); err != nil {
		t.Fatalf("receiver exit: %v\n%s", err, stays.output())
	}
	for _, want := range []string{"decrypted=150", "auth_failures=0", "replays_rejected=0", "lost_after_start=0", "epoch=2"} {
		if !strings.Contains(result, want) {
			t.Fatalf("receiver result %q lacks %q", result, want)
		}
	}
	if video != "synthetic frames (ffmpeg not found)" && strings.Contains(result, "keyframes=0") {
		t.Fatalf("no H.264 key frame seen in decrypted video: %s", result)
	}
	t.Logf("separate processes, %s: remaining receiver %s", video, result)
}
