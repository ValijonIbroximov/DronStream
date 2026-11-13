#!/usr/bin/env bash
# Runs both test suites of the E2EE proof of concept:
#   Go   - RFC 9605 / RFC 9180 vectors, end-to-end chain, interop, real processes
#   Node - RFC 9605 / RFC 9180 vectors, interop with Go, receive rules
# Works in Git Bash on Windows and on Linux/macOS. Starts no long-lived
# process and listens only on OS-assigned loopback ports.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"

# Use the repository's own toolchains (.tools/) when Go is not on PATH.
if ! command -v go >/dev/null 2>&1 && [ -f "$REPO/scripts/devenv.sh" ]; then
  # shellcheck disable=SC1091
  source "$REPO/scripts/devenv.sh"
fi
command -v go >/dev/null 2>&1 || { echo "run-tests: go not found" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "run-tests: node (>= 22) not found" >&2; exit 1; }

cd "$HERE"

echo "== Go: vet =="
go vet ./...

echo "== Go: tests =="
go test -count=1 ./...

echo "== Node: dependencies (pinned in package-lock.json) =="
if [ ! -d node_modules/@hpke/core ] || [ ! -d node_modules/esbuild ]; then
  npm ci --no-audit --no-fund
else
  echo "node_modules present"
fi

echo "== Node: bundle the viewer =="
npm run --silent build

echo "== Node: tests =="
npm test --silent

echo "== ALL TESTS PASSED =="
