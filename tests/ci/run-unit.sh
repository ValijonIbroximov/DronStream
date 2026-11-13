#!/usr/bin/env bash
# CI: go vet va unit testlar (Linux).
set -uo pipefail
LOG="${RUNNER_TEMP:-/tmp}/unit.log"
cd "$(dirname "${BASH_SOURCE[0]}")/../../backend"
if ! go vet ./...; then echo "::error title=go vet::go vet xato topdi"; exit 1; fi
go test ./internal/... -count=1 > "$LOG" 2>&1
RC=$?
cat "$LOG"
if [ "$RC" -ne 0 ]; then
  grep -E '(--- FAIL|_test\.go:[0-9]+:|^FAIL)' "$LOG" | head -n 8 | while IFS= read -r l; do echo "::error title=unit testlar::$l"; done
  exit "$RC"
fi
echo "::notice title=unit testlar (linux)::$(grep -c '^ok' "$LOG") paket o'tdi"
