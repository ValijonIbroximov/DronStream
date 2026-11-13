#!/usr/bin/env bash
# Linux paketining HAQIQIY Linux'dagi sinovi (GitHub Actions Ubuntu runner: systemd bor, sudo parolsiz).
# O'rnatadi, systemd xizmati sifatida ishga tushiradi va xatti-harakatini tekshiradi.
#
# Ishlatish:   bash tests/ci/linux-package-test.sh <paket-v1.tar.gz> <paket-v2.tar.gz>
#   v1 o'rnatiladi, keyin v2 ga yangilanadi va v1 ga qaytariladi.
# Diqqat: /opt/dronstream-ci va dronstream.service ni yaratadi - faqat bir martalik CI mashinasida ishlating.
set -uo pipefail
TGZ1="${1:?paket v1}"; TGZ2="${2:?paket v2}"
ROOT="/opt/dronstream-ci"
BASE="https://127.0.0.1:8443"
WORK="$(mktemp -d)"
JAR="$WORK/jar"; CSRF=""
BK_PASS="Ci-Backup-Passphrase-123"
ADMIN_PASS="Ci-Admin-Password-1"
PASS=0; FAIL=0
pass() { echo "PASS  $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL  $1 ${2:-}"; echo "::error title=$(basename "$0")::FAIL $1 ${2:-}"; FAIL=$((FAIL + 1)); }
expect() { if [ "$2" = "$3" ]; then pass "$1"; else fail "$1" "(kutilgan '$3', olingan '$2')"; fi; }
api() { # METHOD PATH [JSON]
  local a=(-ksS -b "$JAR" -c "$JAR" -X "$1" "$BASE$2" -H 'X-DS-Request: 1' -H "X-CSRF-Token: $CSRF")
  if [ $# -ge 3 ]; then a+=(-H 'Content-Type: application/json' -d "$3"); fi
  curl "${a[@]}"
}
TOTP_SECRET=""
# RFC 6238 code from the base32 secret (python3 standard library only).
totp() { python3 -c 'import base64,hmac,hashlib,struct,sys,time
k=base64.b32decode(sys.argv[1]+"="*(-len(sys.argv[1])%8)); m=hmac.new(k,struct.pack(">Q",int(time.time())//30),hashlib.sha1).digest(); o=m[-1]&15
print("%06d"%((struct.unpack(">I",m[o:o+4])[0]&0x7fffffff)%1000000))' "$1"; }
# Sign in as admin; with TOTP enabled the current code is sent. A code can be used once per
# 30 s step (replay protection), so a second login in the same step waits for the next one.
login() {
  local i r otp=""
  for i in 1 2; do
    CSRF=""; rm -f "$JAR"
    if [ -n "$TOTP_SECRET" ]; then otp="$(totp "$TOTP_SECRET")"; fi
    r="$(api POST /api/login "{\"username\":\"boss\",\"password\":\"$ADMIN_PASS\",\"otp\":\"$otp\"}")"
    CSRF="$(echo "$r" | jq -r '.csrf // empty')"
    [ -n "$CSRF" ] && return 0
    [ "$(echo "$r" | jq -r '.code // empty')" = "bad_otp" ] && sleep 31 || return 1
  done
  return 1
}
wait_health() { local i; for i in $(seq 1 "${1:-60}"); do [ "$(curl -ks -o /dev/null -w '%{http_code}' "$BASE/api/health")" = "200" ] && return 0; sleep 1; done; return 1; }
dump() { echo "---- journal ----"; sudo journalctl -u dronstream -n 60 --no-pager || true; sudo journalctl -u dronstream -n 6 --no-pager -o cat 2>/dev/null | while IFS= read -r l; do echo "::warning title=journal::$l"; done; }
trap 'if [ "$FAIL" -gt 0 ]; then dump; fi' EXIT

mkdir -p "$WORK/p1" "$WORK/p2"
tar -xzf "$TGZ1" -C "$WORK/p1"; tar -xzf "$TGZ2" -C "$WORK/p2"
PKG1="$(echo "$WORK"/p1/*)"; PKG2="$(echo "$WORK"/p2/*)"
V1="$(cat "$PKG1/VERSION")"; V2="$(cat "$PKG2/VERSION")"
echo "Paketlar: $V1, $V2 | $(. /etc/os-release; echo "$PRETTY_NAME") | $(uname -m)"

# ---- preflight (read-only) ----
if bash "$PKG1/scripts/preflight.sh" --root "$ROOT"; then pass "preflight: to'siq yo'q (exit 0)"; else fail "preflight"; fi
if bash "$PKG1/scripts/install.sh" --root "/opt/<papka>" >/dev/null 2>&1; then fail "placeholder ROOT rad etilmadi"; else pass "to'ldirilmagan <...> ROOT rad etiladi"; fi
if bash "$PKG1/scripts/install.sh" --root /etc >/dev/null 2>&1; then fail "tizim papkasi ROOT rad etilmadi"; else pass "tizim papkasi ROOT sifatida rad etiladi"; fi

# ---- install + systemd ----
if sudo bash "$PKG1/scripts/install.sh" --root "$ROOT" --enable --start; then pass "install.sh --enable --start"; else fail "install.sh"; exit 1; fi
expect "paket sozlamasi secure rejimda" "$(sudo grep -c '^  mode: "secure"' "$ROOT/config/dronstream.yaml")" "1"
expect "secure: shifrlanmagan RTMP sukut bo'yicha o'chiq (1935 tinglanmaydi)" "$(ss -H -ltn 2>/dev/null | awk '$4 ~ /:1935$/' | wc -l | tr -d ' ')" "0"
expect "systemd: active" "$(systemctl is-active dronstream)" "active"
expect "systemd: enabled (qayta yuklashda avtomatik)" "$(systemctl is-enabled dronstream)" "enabled"
MAINPID="$(systemctl show -p MainPID --value dronstream)"
expect "xizmat root emas, alohida hisobda" "$(ps -o user= -p "$MAINPID" | tr -d ' ')" "dronstream"
MTXPID="$(pgrep -P "$MAINPID" -x mediamtx || true)"
if [ -n "$MTXPID" ]; then pass "MediaMTX xizmatning child jarayoni"; else fail "MediaMTX child topilmadi"; fi
expect "master.key: 600, egasi xizmat" "$(sudo stat -c '%a %U' "$ROOT/config/secrets/master.key")" "600 dronstream"
expect "master.key formati DSK0 (DPAPI'siz)" "$(sudo head -c 4 "$ROOT/config/secrets/master.key")" "DSK0"
expect "config: 640 root:dronstream" "$(sudo stat -c '%a %U:%G' "$ROOT/config/dronstream.yaml")" "640 root:dronstream"
expect "data: 700" "$(sudo stat -c '%a %U' "$ROOT/data")" "700 dronstream"
if sudo -u dronstream test -w "$ROOT/app/current/dronstream"; then fail "xizmat o'z binary'sini o'zgartira oladi"; else pass "dastur fayllari xizmat uchun faqat o'qish"; fi
if wait_health 30; then pass "HTTPS health 200"; else fail "health"; fi
if sudo journalctl -u dronstream --no-pager | grep -q "running as root"; then fail "root ogohlantirishi chiqdi"; else pass "root sifatida ishlamayapti (logda ogohlantirish yo'q)"; fi

# ---- first admin, data ----
TOK="$(sudo cat "$ROOT/data/runtime/setup-token.txt" | tr -d '[:space:]')"
CSRF="$(api POST /api/setup "{\"setupToken\":\"$TOK\",\"username\":\"boss\",\"password\":\"$ADMIN_PASS\"}" | jq -r '.csrf // empty')"
if [ -n "$CSRF" ]; then pass "birinchi administrator (bir martalik kod)"; else fail "setup"; fi
if sudo journalctl -u dronstream --no-pager | grep -q "$TOK"; then fail "setup kodi jurnalga yozilgan"; else pass "setup kodi jurnalga yozilmagan"; fi
# ---- secure mode: an administrator without TOTP can only enrol ----
expect "secure: TOTP'siz admin API bloklangan" "$(api GET /api/admin/users | jq -r '.code')" "mfa_setup_required"
TS="$(api POST /api/me/totp/setup '{}')"
TOTP_SECRET="$(echo "$TS" | jq -r '.secret // empty')"
if echo "$TS" | jq -r '.uri' | grep -q '^otpauth://totp/'; then pass "TOTP: otpauth QR ma'lumoti berildi"; else fail "TOTP setup"; fi
REC="$(api POST /api/me/totp/enable "{\"code\":\"$(totp "$TOTP_SECRET")\"}" | jq -r '.recoveryCodes | length')"
expect "TOTP yoqildi, 10 ta tiklash kodi" "$REC" "10"
OLDJAR="$JAR"; JAR="$WORK/jar-nootp"
expect "parolning o'zi bilan kirish rad (mfa_required)" "$(api POST /api/login "{\"username\":\"boss\",\"password\":\"$ADMIN_PASS\"}" | jq -r '.code')" "mfa_required"
JAR="$OLDJAR"
sleep 31   # the enabling code's 30 s step is spent: wait for a fresh one
if login; then pass "parol + TOTP bilan kirish"; else fail "TOTP login"; fi
api POST /api/admin/users '{"username":"viewer1","password":"Viewer-Pass-12345","role":"user"}' >/dev/null
ST="$(api POST /api/admin/streams '{"name":"Pult X","slug":"pultx"}')"
SID="$(echo "$ST" | jq -r '.stream.id')"; KEY="$(echo "$ST" | jq -r '.key')"
ONLINE=""
for i in $(seq 1 30); do ONLINE="$(api GET /api/admin/streams | jq -r '.[] | select(.slug=="demo-a") | .stats.online')"; [ "$ONLINE" = "true" ] && break; sleep 1; done
expect "demo manba efirda (MediaMTX + WHIP Linux'da ishlaydi)" "$ONLINE" "true"
DEMO="$(api GET /api/admin/streams | jq -r '.[] | select(.slug=="demo-a") | .id')"
TK="$(api POST "/api/watch/$DEMO/ticket" '{"tab":"ci"}' | jq -r '.ticket // empty')"
if [ -n "$TK" ]; then pass "ko'rish chiptasi beriladi"; else fail "ticket"; fi
expect "efirda bo'lmagan stream: stream_offline" "$(api POST "/api/watch/$SID/ticket" '{"tab":"ci"}' | jq -r '.code')" "stream_offline"

# ---- fail-closed: backend killed -> MediaMTX must die with it; systemd restarts the service ----
sudo kill -9 "$MAINPID"
GONE=0; for i in $(seq 1 30); do if ! sudo kill -0 "$MTXPID" 2>/dev/null; then GONE=1; break; fi; sleep 0.1; done
if [ "$GONE" -eq 1 ]; then pass "backend o'ldirilganda MediaMTX ham to'xtadi (<= 3 s)"; else fail "MediaMTX backend'siz ishlab qoldi"; fi
if wait_health 60; then pass "systemd xizmatni qayta ishga tushirdi (Restart=on-failure)"; else fail "avtomatik qayta ishga tushmadi"; fi

# ---- idempotent re-install keeps configuration ----
H1="$(sudo sha256sum "$ROOT/config/dronstream.yaml" | cut -d' ' -f1)"
sudo sed -i 's/^  session_hours: 24$/  session_hours: 23/' "$ROOT/config/dronstream.yaml"
H2="$(sudo sha256sum "$ROOT/config/dronstream.yaml" | cut -d' ' -f1)"
sudo bash "$PKG1/scripts/install.sh" --root "$ROOT" >/dev/null
expect "install.sh qayta: konfiguratsiya o'zgarmadi" "$(sudo sha256sum "$ROOT/config/dronstream.yaml" | cut -d' ' -f1)" "$H2"
[ "$H1" != "$H2" ] || fail "test konfiguratsiyani o'zgartira olmadi"

# ---- secret file mode is enforced ----
sudo systemctl stop dronstream
sudo chmod 644 "$ROOT/config/secrets/master.key"
sudo systemctl start dronstream || true
sleep 4
if sudo journalctl -u dronstream --no-pager -n 30 | grep -q "chmod 600"; then pass "keng huquqli master.key bilan ishga tushmaydi (aniq xabar)"; else fail "master.key huquqi tekshirilmadi"; fi
sudo systemctl stop dronstream; sudo chmod 600 "$ROOT/config/secrets/master.key"; sudo systemctl start dronstream
if wait_health 60; then pass "huquq tuzatilgach ishga tushdi"; else fail "huquq tuzatilgach ishga tushmadi"; fi

# ---- secure mode refuses to start with unencrypted RTMP on all interfaces ----
sudo systemctl stop dronstream
sudo cp "$ROOT/config/dronstream.yaml" "$WORK/cfg.bak"
sudo sed -i 's/^  rtmp_listen: ""/  rtmp_listen: ":1935"/' "$ROOT/config/dronstream.yaml"
sudo systemctl start dronstream || true
sleep 5
if [ "$(systemctl is-active dronstream || true)" != "active" ] && sudo journalctl -u dronstream -n 30 --no-pager | grep -q "security.mode=secure"; then
  pass "secure: rtmp_listen \":1935\" bilan xizmat ishga tushmaydi (aniq sabab jurnalda)"
else
  fail "secure: ochiq RTMP bilan ishga tushib ketdi"
fi
sudo systemctl stop dronstream || true
sudo cp "$WORK/cfg.bak" "$ROOT/config/dronstream.yaml"
sudo systemctl reset-failed dronstream || true
sudo systemctl start dronstream
if wait_health 60 && login; then pass "sozlama tiklangach ishga tushdi"; else fail "sozlama tiklangach"; fi

# ---- backup / restore ----
if sudo DRONSTREAM_BACKUP_PASSPHRASE="$BK_PASS" bash "$ROOT/scripts/backup.sh" --root "$ROOT" >/dev/null; then pass "backup.sh (server ishlab turganda)"; else fail "backup.sh"; fi
BK="$(sudo sh -c "ls -1t $ROOT/data/backups/dronstream-*.dsbak | head -n1")"
expect "backup sarlavhasi DSBAK2" "$(sudo head -c 6 "$BK")" "DSBAK2"
if sudo grep -aq -e "SQLite format" -e "$KEY" "$BK"; then fail "backup ichida ochiq matn"; else pass "backup shifrlangan (baza/kalit ochiq emas)"; fi
if sudo sh -c "ls $ROOT/data/runtime/.passphrase.* 2>/dev/null" | grep -q .; then fail "parol fayli qolib ketdi"; else pass "vaqtinchalik parol fayli o'chirildi"; fi
sudo systemctl stop dronstream
if sudo DRONSTREAM_BACKUP_PASSPHRASE="Wrong-Passphrase-000" bash "$ROOT/scripts/restore.sh" --root "$ROOT" --in "$BK" --force >/dev/null 2>&1; then fail "noto'g'ri parol qabul qilindi"; else pass "restore: noto'g'ri parol rad etiladi"; fi
if sudo DRONSTREAM_BACKUP_PASSPHRASE="$BK_PASS" bash "$ROOT/scripts/restore.sh" --root "$ROOT" --in "$BK" --force >/dev/null; then pass "restore.sh"; else fail "restore.sh"; fi
sudo systemctl start dronstream
JAR="$WORK/jar-restored"
expect "restore'dan keyin ham TOTP talab qilinadi" "$(api POST /api/login "{\"username\":\"boss\",\"password\":\"$ADMIN_PASS\"}" | jq -r '.code')" "mfa_required"
JAR="$WORK/jar"
if wait_health 60 && login; then pass "restore'dan keyin admin kiradi (parol + TOTP)"; else fail "restore'dan keyin login"; fi
expect "restore'dan keyin KUTISH (standby)" "$(api GET /api/admin/system | jq -r '.state.instanceState')" "standby"
expect "publish kaliti saqlangan" "$(api GET "/api/admin/streams/$SID/key" | jq -r '.key')" "$KEY"
api POST /api/admin/system/instance "{\"state\":\"active\",\"confirm\":\"ESKI SERVER O'CHIRILDI\"}" >/dev/null
expect "faollashtirildi" "$(api GET /api/admin/system | jq -r '.state.instanceState')" "active"

# ---- update v1 -> v2, then rollback to v1 (restores the pre-update backup) ----
if sudo DRONSTREAM_BACKUP_PASSPHRASE="$BK_PASS" bash "$PKG2/scripts/update.sh" --root "$ROOT"; then pass "update.sh $V1 -> $V2"; else fail "update.sh"; fi
expect "faol versiya $V2" "$(sudo cat "$ROOT/app/active.txt")" "$V2"
expect "ishlayotgan binary $V2" "$(sudo "$ROOT/app/current/dronstream" version | head -n1 | awk '{print $1}')" "$V2"
if wait_health 30 && login; then pass "yangilashdan keyin ma'lumotlar joyida (login)"; else fail "yangilashdan keyin login"; fi
if [ -x "$ROOT/app/$V1/dronstream" ]; then pass "eski versiya fayllari saqlangan"; else fail "eski versiya yo'q"; fi
if sudo DRONSTREAM_BACKUP_PASSPHRASE="$BK_PASS" bash "$ROOT/scripts/rollback.sh" --root "$ROOT" --to-version "$V1"; then pass "rollback.sh -> $V1"; else fail "rollback.sh"; fi
expect "rollback'dan keyin faol versiya" "$(sudo cat "$ROOT/app/active.txt")" "$V1"
if wait_health 30 && login; then pass "rollback'dan keyin sog'lom va ma'lumot joyida"; else fail "rollback'dan keyin login"; fi

# ---- service removal keeps data ----
sudo bash "$ROOT/scripts/uninstall-service.sh" >/dev/null
if [ ! -f /etc/systemd/system/dronstream.service ] && sudo test -f "$ROOT/data/dronstream.db"; then pass "xizmat olib tashlandi, ma'lumotlar qoldi"; else fail "uninstall-service"; fi
if pgrep -x mediamtx >/dev/null || pgrep -x dronstream >/dev/null; then fail "jarayonlar qolib ketdi"; else pass "jarayon qolmadi"; fi

echo "NATIJA: $PASS o'tdi, $FAIL o'tmadi"
echo "::notice title=$(basename "$0")::$PASS o'tdi, $FAIL o'tmadi ($(. /etc/os-release; echo "$PRETTY_NAME"), $(uname -m))"
[ "$FAIL" -eq 0 ]
