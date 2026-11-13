#!/usr/bin/env bash
# DronStream ni yangi versiyaga yangilaydi. YANGI paket ichidan ishga tushiriladi.
#
# Ishlatish:   sudo bash <yangi-paket>/scripts/update.sh [--root /opt/dronstream]
#   Backup paroli: DRONSTREAM_BACKUP_PASSPHRASE muhit o'zgaruvchisi yoki so'ralganda klaviaturadan (ekranda ko'rinmaydi).
#
# Tartib: 1) yangi paket SHA256 tekshiruvi  2) yangilashdan oldingi shifrlangan backup (majburiy)
#         3) xizmatni to'xtatish, app/<yangi> ni o'rnatish, faol versiyani almashtirish
#         4) ishga tushirish va health-check  5) sog'lom bo'lmasa - rollback.sh orqali oldingi holat.
# Eski versiya fayllari app/<eski> da qoladi. Konfiguratsiya va ma'lumotlar o'zgartirilmaydi.
. "$(dirname "${BASH_SOURCE[0]}")/ds-env.sh"

ROOT="$DS_DEFAULT_ROOT"
while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) die "Noma'lum parametr: $1" 4 ;;
  esac
done
ds_validate_root "$ROOT"
ds_need_root "$@"
PKG="$(ds_pkg_dir)"
if [ "$PKG" -ef "$ROOT" ]; then die "update.sh ni o'rnatilgan papkadan emas, YANGI paket ichidan ishga tushiring" 4; fi
NEW="$(tr -d '[:space:]' < "$PKG/VERSION")"
OLD="$(ds_active_version "$ROOT")"
[ -n "$OLD" ] || die "$ROOT da o'rnatish topilmadi. Birinchi o'rnatish: sudo bash $PKG/scripts/install.sh --root $ROOT" 4
[ "$NEW" != "$OLD" ] || die "Bu versiya ($NEW) allaqachon faol" 4
[ -f "$PKG/app/$NEW/dronstream" ] || die "Paketda app/$NEW/dronstream yo'q (Linux paketi kerak)"
SVC_USER="$(ds_owner_of "$ROOT/data")"
say "Yangilash: $OLD -> $NEW  (ildiz: $ROOT, xizmat foydalanuvchisi: $SVC_USER)"

step "1/5 Paket tekshirilmoqda"
ds_verify_package "$PKG"

step "2/5 Yangilashdan oldingi backup"
PF="$(ds_passphrase_file "$ROOT" "$SVC_USER" confirm)"
trap 'rm -f "$PF"' EXIT
BK="$ROOT/data/backups/pre-update-$OLD-to-$NEW-$(date +%Y%m%d-%H%M%S).dsbak"
ds_as_user "$SVC_USER" "$(ds_exe "$ROOT" "$OLD")" backup --root "$ROOT" --out "$BK" --passphrase-file "$PF" \
  || die "Backup muvaffaqiyatsiz - yangilash to'xtatildi, hech narsa o'zgarmadi"
say "  $BK"

step "3/5 To'xtatish va fayllarni o'rnatish"
ds_service_stop "$ROOT" "$SVC_USER"
mkdir -p "$ROOT/app/$NEW"
cp -R "$PKG/app/$NEW/." "$ROOT/app/$NEW/"
chmod 755 "$ROOT/app/$NEW" "$ROOT/app/$NEW/mediamtx" "$ROOT/app/$NEW/dronstream" "$ROOT/app/$NEW/mediamtx/mediamtx"
cp "$PKG"/scripts/* "$ROOT/scripts/"
cp "$PKG"/docs/* "$ROOT/docs/" 2>/dev/null || true
if [ -f "$PKG/info.html" ]; then cp "$PKG/info.html" "$ROOT/"; fi
cp "$PKG/VERSION" "$ROOT/VERSION"
cp "$PKG/config/dronstream.example.yaml" "$ROOT/config/dronstream.example.yaml"
ln -sfn "$NEW" "$ROOT/app/current"
printf '%s\n' "$NEW" > "$ROOT/app/active.txt"

step "4/5 Ishga tushirish"
ds_service_start
if ds_wait_healthy "$ROOT" "$SVC_USER" 60; then
  step "5/5 Tayyor: $NEW ishlayapti. Oldingi versiya: $ROOT/app/$OLD, backup: $BK"
  exit 0
fi
warn "5/5 Yangi versiya sog'lom emas - oldingi versiya ($OLD) qaytarilmoqda"
DRONSTREAM_BACKUP_PASSPHRASE="$(cat "$PF")" bash "$ROOT/scripts/rollback.sh" --root "$ROOT" --to-version "$OLD" --backup "$BK" || true
exit 1
