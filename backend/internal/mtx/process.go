package mtx

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"sync"
	"time"
)

// Process supervises mediamtx.exe as a child process. On Windows the child is
// placed in a Job Object with KILL_ON_JOB_CLOSE, so if DronStream dies for
// any reason the OS kills MediaMTX too and all media stops (fail-closed).
type Process struct {
	Binary   string
	ConfPath string
	Output   io.Writer // masked log writer
	Log      *slog.Logger
	API      *Client

	mu      sync.Mutex
	cmd     *exec.Cmd
	job     jobHandle
	stopped bool
	exited  chan struct{}
}

func (p *Process) Start(ctx context.Context) error {
	if _, err := os.Stat(p.Binary); err != nil {
		return fmt.Errorf("mediamtx binary not found at %s: %w", p.Binary, err)
	}
	job, err := newKillOnCloseJob()
	if err != nil {
		return fmt.Errorf("job object: %w", err)
	}
	p.job = job
	if err := p.spawn(); err != nil {
		return err
	}
	go p.supervise(ctx)
	return p.waitReady(ctx, 15*time.Second)
}

func (p *Process) spawn() error {
	cmd := exec.Command(p.Binary, p.ConfPath)
	cmd.Stdout = p.Output
	cmd.Stderr = p.Output
	configureChild(cmd)
	if err := cmd.Start(); err != nil {
		return err
	}
	if err := p.job.assign(cmd.Process.Pid); err != nil {
		cmd.Process.Kill()
		return fmt.Errorf("assign to job: %w", err)
	}
	p.mu.Lock()
	p.cmd = cmd
	p.exited = make(chan struct{})
	ch := p.exited
	p.mu.Unlock()
	go func() { cmd.Wait(); close(ch) }()
	p.Log.Info("mediamtx started", "pid", cmd.Process.Pid, "version", PinnedVersion)
	return nil
}

func (p *Process) supervise(ctx context.Context) {
	backoff := time.Second
	for {
		p.mu.Lock()
		ch := p.exited
		p.mu.Unlock()
		select {
		case <-ctx.Done():
			return
		case <-ch:
		}
		p.mu.Lock()
		stopped := p.stopped
		p.mu.Unlock()
		if stopped {
			return
		}
		p.Log.Error("mediamtx exited unexpectedly; restarting", "backoff", backoff)
		time.Sleep(backoff)
		if backoff < 30*time.Second {
			backoff *= 2
		}
		if err := p.spawn(); err != nil {
			p.Log.Error("mediamtx restart failed", "err", err)
		}
	}
}

func (p *Process) waitReady(ctx context.Context, d time.Duration) error {
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		c, cancel := context.WithTimeout(ctx, time.Second)
		_, err := p.API.Paths(c)
		cancel()
		if err == nil {
			return nil
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(200 * time.Millisecond):
		}
	}
	return errors.New("mediamtx API did not become ready (check logs/mediamtx.log; ports may be in use)")
}

// Stop kills MediaMTX (Windows has no graceful signal for console children).
func (p *Process) Stop() {
	p.mu.Lock()
	p.stopped = true
	cmd := p.cmd
	ch := p.exited
	p.mu.Unlock()
	if cmd != nil && cmd.Process != nil {
		cmd.Process.Kill()
		select {
		case <-ch:
		case <-time.After(5 * time.Second):
		}
	}
	if p.job != nil {
		p.job.close()
	}
}

// Running reports whether the child is alive.
func (p *Process) Running() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.exited == nil {
		return false
	}
	select {
	case <-p.exited:
		return false
	default:
		return true
	}
}

func (p *Process) PID() int {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.cmd == nil || p.cmd.Process == nil {
		return 0
	}
	return p.cmd.Process.Pid
}
