#!/usr/bin/env bash
# CI (Ubuntu runner): Windows'da olingan shifrlangan backupni Linux'da tiklaydi va ma'lumotlarni tekshiradi.
# Windows'dagi DPAPI bilan o'ralgan master kalit Linux'da ochilmaydi: ko'chirish faqat parolli .dsbak orqali.
#
# Ishlatish:   bash tests/ci/restore-windows-backup.sh <linux-paket.tar.gz> <win.dsbak> <expect.json>
set -uo pipefail
TGZ="${1:?paket}"; DSBAK="${2:?backup}"; EXPECT="${3:?expect.json}"
ROOT="/opt/dronstream-mig"
BASE="https://127.0.0.1:8443"
WORK="$(mktemp -d)"; JAR="$WORK/jar"; CSRF=""
PASS=0; FAIL=0
pass() { echo "PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL  $1 ${2:-}"; echo "::error title=$(basename "$0")::FAIL $1 ${2:-}"; FAIL=$((FAIL + 1)); }
expect() { if [ "$2" = "$3" ]; then pass "$1"; else fail "$1" "(kutilgan '$3', olingan '$2')"; fi; }
api() {
  local a=(-ksS -b "$JAR" -c "$JAR" -X "$1" "$BASE$2" -H 'X-DS-Request: 1' -H "X-CSRF-Token: $CSRF")
  if [ $# -ge 3 ]; then a+=(-H 'Content-Type: application/json' -d "$3"); fi
  curl "${a[@]}"
}
wait_health() { local i; for i in $(seq 1 60); do [ "$(curl -ks -o /dev/null -w '%{http_code}' "$BASE/api/health")" = "200" ] && return 0; sleep 1; done; return 1; }
trap 'if [ "$FAIL" -gt 0 ]; then sudo journalctl -u dronstream -n 60 --no-pager || true; fi' EXIT
j() { jq -r "$1" "$EXPECT"; }

expect "backup Windows'da olingan, kalit DPAPI (DSK1) edi" "$(j .os):$(j .masterKeyFormat)" "windows:DSK1"
tar -xzf "$TGZ" -C "$WORK"; PKG="$(echo "$WORK"/DronStream-*)"
if sudo bash "$PKG/scripts/install.sh" --root "$ROOT" --enable; then pass "Linux'ga toza o'rnatish (ishga tushirilmagan)"; else fail "install.sh"; exit 1; fi
if sudo DRONSTREAM_BACKUP_PASSPHRASE="$(j .backupPassphrase)" bash "$ROOT/scripts/restore.sh" --root "$ROOT" --in "$DSBAK"; then pass "Windows backup Linux'da tiklandi"; else fail "restore.sh"; fi
expect "master kalit Linux formatiga qayta bog'landi (DSK0, 600)" "$(sudo head -c 4 "$ROOT/config/secrets/master.key") $(sudo stat -c '%a %U' "$ROOT/config/secrets/master.key")" "DSK0 600 dronstream"
sudo systemctl start dronstream
if wait_health; then pass "tiklangan server ishga tushdi"; else fail "health"; fi
CSRF="$(api POST /api/login "{\"username\":\"boss\",\"password\":\"$(j .adminPassword)\"}" | jq -r '.csrf // empty')"
if [ -n "$CSRF" ]; then pass "Windows'da yaratilgan admin Linux'da kiradi"; else fail "login"; fi
expect "KUTISH (standby) rejimida boshlandi" "$(api GET /api/admin/system | jq -r '.state.instanceState')" "standby"
expect "publish kaliti o'qiladi (shifrlangan nusxa yangi master kalit ostida)" "$(api GET "/api/admin/streams/$(j .streamId)/key" | jq -r '.key')" "$(j .streamKey)"
expect "foydalanuvchi va ruxsat ko'chdi" "$(api GET /api/admin/permissions | jq -r '[.[] | select(.objectTitle=="Pult X" or .streamName=="Pult X")] | length > 0')" "true"
expect "matn kontenti ko'chdi" "$(api GET /api/admin/contents | jq -r "[.[] | select(.id==$(j .textId))] | length")" "1"
api POST /api/admin/system/instance "{\"state\":\"active\",\"confirm\":\"ESKI SERVER O'CHIRILDI\"}" >/dev/null
expect "faollashtirildi" "$(api GET /api/admin/system | jq -r '.state.instanceState')" "active"
expect "rasm fayli bayt-ma-bayt bir xil (SHA-256)" "$(curl -ksS -b "$JAR" "$BASE/api/content/$(j .imageId)/file" | sha256sum | cut -d' ' -f1)" "$(j .imageSha256)"
sudo bash "$ROOT/scripts/uninstall-service.sh" >/dev/null
echo "NATIJA: $PASS o'tdi, $FAIL o'tmadi"
echo "::notice title=$(basename "$0")::$PASS o'tdi, $FAIL o'tmadi ($(. /etc/os-release; echo "$PRETTY_NAME"), $(uname -m))"
[ "$FAIL" -eq 0 ]
