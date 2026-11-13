#!/usr/bin/env bash
# CI: integratsiya testlarini ishga tushiradi va natijani ochiq annotatsiya sifatida chiqaradi
# (run sahifasida log'ga kirmasdan ham ko'rinadi).
#
# Ishlatish:   DS_MEDIAMTX=/yo'l/mediamtx bash tests/ci/run-integration.sh
set -uo pipefail
LOG="${RUNNER_TEMP:-/tmp}/integration.log"
cd "$(dirname "${BASH_SOURCE[0]}")/../../backend"
go test -tags integration ./integration -run 'TestAcceptance|TestLinksAndMedia|TestPlayerSlots|TestTURNRelay' -count=1 -timeout 25m -v > "$LOG" 2>&1
RC=$?
grep -E '^(=== RUN|--- |PASS|FAIL|ok|panic)' "$LOG" || true
if [ "$RC" -ne 0 ]; then
  grep -E '(--- FAIL|_test\.go:[0-9]+:)' "$LOG" | head -n 8 | while IFS= read -r l; do echo "::error title=integratsiya::$l"; done
  tail -n 60 "$LOG"
  exit "$RC"
fi
echo "::notice title=integratsiya (linux)::$(grep -c '^--- PASS' "$LOG") test o'tdi: $(grep '^--- PASS' "$LOG" | awk '{print $3}' | tr '\n' ' ')"
