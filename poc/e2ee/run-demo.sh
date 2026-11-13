#!/usr/bin/env bash
# Starts the E2EE proof-of-concept demo on the loopback interface:
#   relay (keyless)  ->  http://127.0.0.1:59320
#   viewerhost       ->  http://127.0.0.1:59321/viewer.html   (separate origin: delivers the viewer page)
#   source           ->  publisher simulator in the foreground; operator control on http://127.0.0.1:59322
#
#   ./run-demo.sh                 # type operator commands into the source (list, approve ..., revoke ..., quit)
#   ./run-demo.sh --attack-hooks  # relay also exposes the malicious-relay simulation
#   ./run-demo.sh --synthetic     # no ffmpeg: synthetic frames, counters only
#   ./run-demo.sh --check         # self-check with the headless Go receiver, then stop
#   options: --relay-port N --viewer-port N --control-port N --stream ID
#
# On exit (quit, Ctrl+C or error) the script stops the processes it started,
# by their process ids, and nothing else. For a detached demo on Windows use
# run-demo.ps1 -Background / -Stop.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
RELAY_PORT=59320 VIEWER_PORT=59321 CONTROL_PORT=59322 STREAM=demo
ATTACK=0 SYNTHETIC=0 CHECK=0

while [ $# -gt 0 ]; do
  case "$1" in
    --relay-port) RELAY_PORT="$2"; shift 2 ;;
    --viewer-port) VIEWER_PORT="$2"; shift 2 ;;
    --control-port) CONTROL_PORT="$2"; shift 2 ;;
    --stream) STREAM="$2"; shift 2 ;;
    --attack-hooks) ATTACK=1; shift ;;
    --synthetic) SYNTHETIC=1; shift ;;
    --check) CHECK=1; shift ;;
    -h|--help) sed -n '2,15p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "run-demo: unknown option $1" >&2; exit 2 ;;
  esac
done

# Ports of the DronStream server itself: this demo must never use them.
for port in "$RELAY_PORT" "$VIEWER_PORT" "$CONTROL_PORT"; do
  case " 8443 1935 9180 9997 8889 8189 " in
    *" $port "*) echo "run-demo: port $port belongs to the DronStream server; choose another port" >&2; exit 2 ;;
  esac
done
case "$STREAM" in *[!A-Za-z0-9_-]*|"") echo "run-demo: stream id: letters, digits, _ and - only" >&2; exit 2 ;; esac

if ! command -v go >/dev/null 2>&1 && [ -f "$REPO/scripts/devenv.sh" ]; then
  # shellcheck disable=SC1091
  source "$REPO/scripts/devenv.sh"
fi
command -v go >/dev/null 2>&1 || { echo "run-demo: go not found" >&2; exit 1; }

cd "$HERE"
RUN="$HERE/.run"
BIN="$RUN/bin"
mkdir -p "$BIN"
echo "== building the PoC programs =="
go build -o "$BIN/" ./cmd/relay ./cmd/viewerhost ./cmd/source ./cmd/receiver ./cmd/operator
if [ ! -f viewer/viewer.bundle.js ]; then
  echo "== bundling the viewer =="
  [ -d node_modules/esbuild ] || npm ci --no-audit --no-fund
  npm run --silent build
fi

RELAY_URL="http://127.0.0.1:$RELAY_PORT"
VIEWER_URL="http://127.0.0.1:$VIEWER_PORT"
CONTROL_URL="http://127.0.0.1:$CONTROL_PORT"

PIDS=()
cleanup() {
  for pid in "${PIDS[@]:-}"; do
    if [ -n "$pid" ] && kill "$pid" 2>/dev/null; then echo "stopped process $pid"; fi
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT

# start NAME ARGS...: runs a PoC program in the background, logs in .run/.
start() {
  local name="$1"; shift
  "$BIN/$name" "$@" >"$RUN/$name.out.log" 2>"$RUN/$name.err.log" &
  LAST_PID=$!
  PIDS+=("$LAST_PID")
}

# wait_port PORT NAME PID: waits until the port accepts connections and the
# process we started is still alive (so it is ours that listens).
wait_port() {
  local i
  for i in $(seq 1 60); do
    if ! kill -0 "$3" 2>/dev/null; then break; fi
    if (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; then
      sleep 0.3
      if kill -0 "$3" 2>/dev/null; then return 0; fi
      break
    fi
    sleep 0.2
  done
  echo "run-demo: $2 did not start (is port $1 already in use?). Its messages:" >&2
  cat "$RUN/$2.err.log" >&2 || true
  exit 1
}

RELAY_ARGS=(-port "$RELAY_PORT" -viewer-origins "http://127.0.0.1:$VIEWER_PORT,http://localhost:$VIEWER_PORT")
[ "$ATTACK" = 1 ] && RELAY_ARGS+=(-attack-hooks)
start relay "${RELAY_ARGS[@]}"
wait_port "$RELAY_PORT" relay "$LAST_PID"

SOURCE_ARGS=(-relay "$RELAY_URL" -stream "$STREAM" -control-port "$CONTROL_PORT")
[ "$SYNTHETIC" = 1 ] && SOURCE_ARGS+=(-synthetic)

if [ "$CHECK" = 1 ]; then
  start source "${SOURCE_ARGS[@]}"
  wait_port "$CONTROL_PORT" source "$LAST_PID"
  start receiver -relay "$RELAY_URL" -stream "$STREAM" -label self-check -frames 60 -timeout 60s
  RECEIVER_PID=$LAST_PID
  FINGERPRINT=""
  for _ in $(seq 1 50); do
    FINGERPRINT="$(sed -n 's/^FINGERPRINT //p' "$RUN/receiver.out.log" | head -n 1)"
    [ -n "$FINGERPRINT" ] && break
    sleep 0.2
  done
  [ -n "$FINGERPRINT" ] || { echo "run-demo: the receiver did not print its fingerprint" >&2; exit 1; }
  echo "receiver fingerprint: $FINGERPRINT"
  "$BIN/operator" -control "$CONTROL_URL" approve "$FINGERPRINT"
  if wait "$RECEIVER_PID"; then
    grep '^RESULT' "$RUN/receiver.out.log" | tail -n 1
    echo "SELF-CHECK PASSED: relay, source and the Go receiver ran as separate processes; frames were decrypted."
    exit 0
  fi
  grep '^RESULT' "$RUN/receiver.out.log" | tail -n 1 || true
  echo "SELF-CHECK FAILED (see $RUN/*.log)" >&2
  exit 1
fi

start viewerhost -port "$VIEWER_PORT" -dir "$HERE/viewer" -relay-origins "$RELAY_URL,http://localhost:$RELAY_PORT"
wait_port "$VIEWER_PORT" viewerhost "$LAST_PID"

cat <<EOF

Relay (keyless, sees only ciphertext):  $RELAY_URL
Viewer page (separate origin):          $VIEWER_URL/viewer.html?relay=$RELAY_URL&stream=$STREAM
Stream id:                              $STREAM

Operator commands: type them below, or from another terminal:
  "$BIN/operator" -control $CONTROL_URL list
  "$BIN/operator" -control $CONTROL_URL approve <fingerprint shown by the viewer, all 16 groups>
  "$BIN/operator" -control $CONTROL_URL revoke <fingerprint>
  "$BIN/operator" -control $CONTROL_URL status
Headless check without a browser (prints its fingerprint, then approve it):
  "$BIN/receiver" -relay $RELAY_URL -stream $STREAM
EOF
if [ "$ATTACK" = 1 ]; then
  cat <<EOF

Malicious-relay simulation (relay was started with -attack-hooks):
  "$BIN/operator" -relay $RELAY_URL attack tamper 5        (viewer: authentication failures go up)
  "$BIN/operator" -relay $RELAY_URL attack replay 5        (viewer: replays rejected go up)
  "$BIN/operator" -relay $RELAY_URL attack substitute-on   (source list shows a fingerprint the viewer does not have)
  "$BIN/operator" -relay $RELAY_URL attack substitute-off
EOF
fi
echo
echo "The source runs in this terminal. Type: list, approve <fingerprint>, revoke <fingerprint>, status, quit"
echo
"$BIN/source" "${SOURCE_ARGS[@]}"
