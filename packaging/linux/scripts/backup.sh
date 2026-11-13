#!/usr/bin/env bash
# Shifrlangan backup oladi (server ishlab turganda ham mumkin): baza, media, konfiguratsiya va kalitlar.
#
# Ishlatish:   sudo bash scripts/backup.sh [--root /opt/dronstream] [--out /yo'l/fayl.dsbak] [--migrate-out]
#   Parol: DRONSTREAM_BACKUP_PASSPHRASE yoki so'ralganda klaviaturadan. Parol yo'qolsa backup ochilmaydi.
#   --migrate-out: backupdan keyin bu server "ko'chirilgan" holatga o'tadi va xizmat ko'rsatishni to'xtatadi
#                  (boshqa serverga ko'chirishda ishlatiladi; qaytarish: dronstream activate).
. "$(dirname "${BASH_SOURCE[0]}")/ds-env.sh"
ROOT="$DS_DEFAULT_ROOT"; OUT=""; MIG=0
while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="${2:-}"; shift 2 ;;
    --out) OUT="${2:-}"; shift 2 ;;
    --migrate-out) MIG=1; shift ;;
    -h|--help) sed -n '2,7p' "$0"; exit 0 ;;
    *) die "Noma'lum parametr: $1" 4 ;;
  esac
done
ds_validate_root "$ROOT"
ds_need_root "$@"
VER="$(ds_active_version "$ROOT")"; [ -n "$VER" ] || die "$ROOT da o'rnatish topilmadi" 4
SVC_USER="$(ds_owner_of "$ROOT/data")"
[ -n "$OUT" ] || OUT="$ROOT/data/backups/dronstream-$(date +%Y%m%d-%H%M%S).dsbak"
case "$OUT" in *"<"*|*">"*) die "--out to'ldirilmagan: $OUT" 4 ;; esac
PF="$(ds_passphrase_file "$ROOT" "$SVC_USER" confirm)"
trap 'rm -f "$PF"' EXIT
ARGS=(backup --root "$ROOT" --out "$OUT" --passphrase-file "$PF")
[ "$MIG" -eq 0 ] || ARGS+=(--migrate-out)
ds_as_user "$SVC_USER" "$(ds_exe "$ROOT" "$VER")" "${ARGS[@]}"
say "Backup: $OUT"
say "Faylni boshqa xavfsiz joyga ko'chiring; parolni alohida saqlang."
