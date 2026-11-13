#!/usr/bin/env bash
# CI: integratsiya testlarini ishga tushiradi va natijani ochiq annotatsiya sifatida chiqaradi
# (run sahifasida log'ga kirmasdan ham ko'rinadi). CAPTURE=1 bo'lsa testlar davomida loopback'da
# paketlar ushlanadi va tests/ci/pcap-check.py bilan tekshiriladi (WebRTC ochiq video yo'qligi,
# oddiy RTMP ochiqligi).
#
# Ishlatish:   DS_MEDIAMTX=/yo'l/mediamtx [CAPTURE=1] bash tests/ci/run-integration.sh
set -uo pipefail
LOG="${RUNNER_TEMP:-/tmp}/integration.log"
CAP="${RUNNER_TEMP:-/tmp}/integration.pcap"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/../../backend"
TCPDUMP_PID=""
if [ "${CAPTURE:-0}" = "1" ]; then
  sudo tcpdump -i lo -U -s 0 -w "$CAP" 'udp port 18189 or tcp port 11935' >/dev/null 2>&1 &
  TCPDUMP_PID=$!
  sleep 2
fi
go test -tags integration ./integration -run 'TestAcceptance|TestLinksAndMedia|TestPlayerSlots|TestTURNRelay|TestMigrationFromV2' -count=1 -timeout 25m -v > "$LOG" 2>&1
RC=$?
if [ -n "$TCPDUMP_PID" ]; then
  sudo pkill -INT -f "tcpdump -i lo -U -s 0 -w $CAP" || true
  sleep 2
  sudo chmod 644 "$CAP" || true
fi
grep -E '^(=== RUN|--- |PASS|FAIL|ok|panic)' "$LOG" || true
if [ "$RC" -ne 0 ]; then
  grep -E '(--- FAIL|_test\.go:[0-9]+:)' "$LOG" | head -n 8 | while IFS= read -r l; do echo "::error title=integratsiya::$l"; done
  tail -n 60 "$LOG"
  exit "$RC"
fi
echo "::notice title=integratsiya (linux)::$(grep -c '^--- PASS' "$LOG") test o'tdi: $(grep '^--- PASS' "$LOG" | awk '{print $3}' | tr '\n' ' ')"
if [ -n "$TCPDUMP_PID" ]; then
  python3 "$HERE/pcap-check.py" "$CAP" || exit 1
fi
