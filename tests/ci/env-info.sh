#!/usr/bin/env bash
# CI: muhit haqida qisqa ma'lumot.
set -euo pipefail
. /etc/os-release
echo "$PRETTY_NAME $(uname -m)"
go version
node --version
systemctl --version | head -n1
