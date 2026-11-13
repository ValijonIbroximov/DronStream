//go:build !windows

package mtx

import "os/exec"

type jobHandle interface {
	assign(pid int) error
	close()
}

type noJob struct{}

// Non-Windows builds are for development only; no job object equivalent here.
func newKillOnCloseJob() (jobHandle, error) { return noJob{}, nil }
func (noJob) assign(int) error               { return nil }
func (noJob) close()                         {}
func hideWindow(*exec.Cmd)                   {}
