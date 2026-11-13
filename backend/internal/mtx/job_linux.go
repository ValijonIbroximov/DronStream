//go:build linux

package mtx

import (
	"os/exec"
	"syscall"
)

type jobHandle interface {
	assign(pid int) error
	close()
}

type noJob struct{}

// Linux has no job objects. Fail-closed behaviour comes from two layers:
//   - PR_SET_PDEATHSIG (below): the kernel sends SIGKILL to MediaMTX when the
//     DronStream process that started it dies, however it dies;
//   - under systemd, KillMode=control-group additionally stops every process
//     of the unit when the main process exits.
func newKillOnCloseJob() (jobHandle, error) { return noJob{}, nil }
func (noJob) assign(int) error               { return nil }
func (noJob) close()                         {}

func configureChild(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Pdeathsig: syscall.SIGKILL}
}
