#!/usr/bin/env bash
# DronStream ni Linux serverga o'rnatadi (birinchi o'rnatish). Qayta ishga tushirish xavfsiz.
#
# Ishlatish:   sudo bash scripts/install.sh [--root /opt/dronstream] [--user dronstream] [--enable] [--start]
#              bash scripts/install.sh --root DIR --no-user --no-service     (sinov uchun, root'siz)
#
# Nima qiladi:
#   1) paket yaxlitligini tekshiradi (SHA256SUMS.txt);
#   2) alohida huquqsiz xizmat foydalanuvchisini yaratadi (login qila olmaydi);
#   3) ROOT ichida app/, config/, data/, logs/ papkalarini to'g'ri egalik va huquqlar bilan yaratadi;
#   4) config/dronstream.yaml yo'q bo'lsa namunadan yaratadi (mavjud faylni HECH QACHON almashtirmaydi);
#   5) systemd unit yozadi. --enable / --start berilmasa xizmat yoqilmaydi va ishga tushirilmaydi.
# Nima QILMAYDI: firewall, boshqa xizmatlar, mavjud baza va konfiguratsiyaga tegmaydi; paket o'rnatmaydi.
. "$(dirname "${BASH_SOURCE[0]}")/ds-env.sh"

ROOT="$DS_DEFAULT_ROOT"; SVC_USER="$DS_DEFAULT_USER"; NO_USER=0; NO_SERVICE=0; ENABLE=0; START=0
while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="${2:-}"; shift 2 ;;
    --user) SVC_USER="${2:-}"; shift 2 ;;
    --no-user) NO_USER=1; shift ;;
    --no-service) NO_SERVICE=1; shift ;;
    --enable) ENABLE=1; shift ;;
    --start) START=1; shift ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) die "Noma'lum parametr: $1" 4 ;;
  esac
done
ds_validate_root "$ROOT"
case "$ROOT" in /home/*|/root/*|/run/user/*) [ "$NO_SERVICE" -eq 1 ] || die "ROOT uy papkasi ichida bo'lmasin (systemd ProtectHome xizmatga bu yerni yopadi): $ROOT" 4 ;; esac
if [ "$NO_USER" -eq 1 ]; then SVC_USER="$(id -un)"; else ds_validate_user "$SVC_USER"; fi
if [ "$NO_USER" -eq 0 ] || [ "$NO_SERVICE" -eq 0 ]; then ds_need_root "$@"; fi

PKG="$(ds_pkg_dir)"
[ -f "$PKG/VERSION" ] || die "Bu papka DronStream paketi emas (VERSION yo'q): $PKG"
VER="$(tr -d '[:space:]' < "$PKG/VERSION")"
[ -f "$PKG/app/$VER/dronstream" ] || die "Paketda app/$VER/dronstream yo'q. Bu Windows paketi bo'lishi mumkin: Linux uchun *-linux-amd64.tar.gz kerak."
[ "$(uname -m)" = "x86_64" ] || die "Paket amd64 uchun; bu server: $(uname -m)" 5

step "1/5 Paket tekshirilmoqda ($VER)"
ds_verify_package "$PKG"

CUR="$(ds_active_version "$ROOT")"
if [ -n "$CUR" ] && [ "$CUR" != "$VER" ]; then
  die "$ROOT da $CUR versiya o'rnatilgan. Yangilash uchun: sudo bash $PKG/scripts/update.sh --root $ROOT" 4
fi

step "2/5 Xizmat foydalanuvchisi"
if [ "$NO_USER" -eq 1 ]; then
  say "  o'tkazib yuborildi (--no-user): fayllar egasi $SVC_USER"
elif id "$SVC_USER" >/dev/null 2>&1; then
  say "  '$SVC_USER' mavjud"
else
  useradd --system --user-group --no-create-home --home-dir "$ROOT" --shell /usr/sbin/nologin "$SVC_USER"
  say "  '$SVC_USER' yaratildi (tizim hisobi, login qila olmaydi)"
fi
SVC_GROUP="$(id -gn "$SVC_USER")"

step "3/5 Papkalar va dastur fayllari: $ROOT"
own() { if [ "$(id -u)" -eq 0 ]; then chown "$1" "$2"; fi; }
mkdir -p "$ROOT" "$ROOT/app" "$ROOT/config" "$ROOT/config/secrets" "$ROOT/data" "$ROOT/data/backups" "$ROOT/data/media" "$ROOT/data/runtime" "$ROOT/logs" "$ROOT/scripts" "$ROOT/docs"
# Dastur fayllari: root egaligida, xizmat ularni o'zgartira olmaydi.
if [ ! -f "$ROOT/app/$VER/dronstream" ]; then
  mkdir -p "$ROOT/app/$VER"
  cp -R "$PKG/app/$VER/." "$ROOT/app/$VER/"
fi
chmod 755 "$ROOT" "$ROOT/app" "$ROOT/app/$VER" "$ROOT/app/$VER/mediamtx" "$ROOT/app/$VER/dronstream" "$ROOT/app/$VER/mediamtx/mediamtx" "$ROOT/scripts" "$ROOT/docs"
ln -sfn "$VER" "$ROOT/app/current"
printf '%s\n' "$VER" > "$ROOT/app/active.txt"
if [ ! "$PKG" -ef "$ROOT" ]; then   # install.sh o'rnatilgan papkadan qayta ishga tushirilsa nusxalash kerak emas
  cp "$PKG"/scripts/* "$ROOT/scripts/"
  cp "$PKG"/docs/* "$ROOT/docs/" 2>/dev/null || true
  if [ -f "$PKG/info.html" ]; then cp "$PKG/info.html" "$ROOT/"; fi
  cp "$PKG/VERSION" "$ROOT/VERSION"
  cp "$PKG/config/dronstream.example.yaml" "$ROOT/config/dronstream.example.yaml"
fi
# Konfiguratsiya: root tahrirlaydi, xizmat faqat o'qiydi. Sirlar, baza va loglar: faqat xizmat foydalanuvchisi.
own "root:$SVC_GROUP" "$ROOT/config"; chmod 750 "$ROOT/config"
for d in "$ROOT/config/secrets" "$ROOT/data" "$ROOT/data/backups" "$ROOT/data/media" "$ROOT/data/runtime"; do own "$SVC_USER:$SVC_GROUP" "$d"; chmod 700 "$d"; done
own "$SVC_USER:$SVC_GROUP" "$ROOT/logs"; chmod 750 "$ROOT/logs"

step "4/5 Konfiguratsiya"
if [ -f "$ROOT/config/dronstream.yaml" ]; then
  say "  $ROOT/config/dronstream.yaml mavjud - o'zgartirilmadi"
else
  cp "$PKG/config/dronstream.example.yaml" "$ROOT/config/dronstream.yaml"
  say "  namunadan yaratildi: $ROOT/config/dronstream.yaml (public_hosts, publish_host va portlarni tekshiring)"
fi
own "root:$SVC_GROUP" "$ROOT/config/dronstream.yaml"; chmod 640 "$ROOT/config/dronstream.yaml"

step "5/5 systemd xizmati"
if [ "$NO_SERVICE" -eq 1 ]; then
  say "  o'tkazib yuborildi (--no-service). Qo'lda ishga tushirish: $ROOT/app/current/dronstream run --root $ROOT"
else
  TMP="$(mktemp)"
  sed -e "s|@ROOT@|$ROOT|g" -e "s|@USER@|$SVC_USER|g" "$PKG/scripts/dronstream.service" > "$TMP"
  if [ -f "$DS_UNIT" ] && ! cmp -s "$TMP" "$DS_UNIT"; then
    cp "$DS_UNIT" "$DS_UNIT.bak-$(date +%Y%m%d-%H%M%S)"
    say "  mavjud unit farq qiladi: eski nusxasi saqlandi ($DS_UNIT.bak-*)"
  fi
  install -m 644 "$TMP" "$DS_UNIT"; rm -f "$TMP"
  systemctl daemon-reload
  say "  yozildi: $DS_UNIT"
  if [ "$ENABLE" -eq 1 ]; then systemctl enable "$DS_SERVICE"; say "  server qayta yuklanganda avtomatik ishga tushadi (enable)"; fi
  if [ "$START" -eq 1 ]; then
    systemctl start "$DS_SERVICE"
    if ds_wait_healthy "$ROOT" "$SVC_USER" 60; then say "  ishlayapti (health-check o'tdi)"
    else die "Xizmat 60 soniyada sog'lom holatga kelmadi. Sabab: sudo journalctl -u $DS_SERVICE -n 50 --no-pager"; fi
  fi
fi

printf '\n'
say "O'rnatildi: DronStream $VER -> $ROOT (xizmat foydalanuvchisi: $SVC_USER)"
say "Keyingi qadamlar (docs/SERVER_INSTALL_UZ.md):"
say "  1. sudoedit $ROOT/config/dronstream.yaml      # public_hosts, publish_host, kerak bo'lsa portlar"
[ "$NO_SERVICE" -eq 1 ] || say "  2. sudo systemctl enable --now $DS_SERVICE    # ishga tushirish va avtomatik yuklash"
say "  3. Birinchi administrator kodi (bir martalik): sudo cat $ROOT/data/runtime/setup-token.txt"
say "  4. Firewall qoidalari alohida qadam - avtomatik ochilmaydi."
