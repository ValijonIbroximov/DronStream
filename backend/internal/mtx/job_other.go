//go:build !windows && !linux

package mtx

import "os/exec"

type jobHandle interface {
	assign(pid int) error
	close()
}

type noJob struct{}

// Other systems are for development only: there is no kill-on-parent-death
// guarantee here (Windows uses a Job Object, Linux PR_SET_PDEATHSIG).
func newKillOnCloseJob() (jobHandle, error) { return noJob{}, nil }
func (noJob) assign(int) error               { return nil }
func (noJob) close()                         {}
func configureChild(*exec.Cmd)               {}
