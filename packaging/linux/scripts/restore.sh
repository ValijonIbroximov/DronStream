#!/usr/bin/env bash
# Shifrlangan backupni tiklaydi. Windows'da olingan .dsbak ham shu yo'l bilan Linux'ga ko'chiriladi.
#
# Ishlatish:   sudo bash scripts/restore.sh --in /yo'l/fayl.dsbak [--root /opt/dronstream] [--force]
#   Xizmat to'xtatilgan bo'lishi kerak (skript o'zi to'xtatmaydi).
#   --force: mavjud bazani almashtiradi (eski fayl .pre-restore-* nomi bilan saqlanadi).
#   Tiklangan server KUTISH (standby) rejimida ishga tushadi: eski server o'chirilganini tasdiqlagach
#   admin panelda yoki "dronstream activate" bilan faollashtiriladi.
. "$(dirname "${BASH_SOURCE[0]}")/ds-env.sh"
ROOT="$DS_DEFAULT_ROOT"; IN=""; FORCE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="${2:-}"; shift 2 ;;
    --in) IN="${2:-}"; shift 2 ;;
    --force) FORCE=1; shift ;;
    -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
    *) die "Noma'lum parametr: $1" 4 ;;
  esac
done
ds_validate_root "$ROOT"
ds_need_root "$@"
case "$IN" in *"<"*|*">"*|"") die "--in ko'rsatilmagan yoki <...> to'ldirilmagan" 4 ;; esac
[ -f "$IN" ] || die "Backup fayli topilmadi: $IN" 4
VER="$(ds_active_version "$ROOT")"; [ -n "$VER" ] || die "$ROOT da o'rnatish topilmadi. Avval install.sh" 4
SVC_USER="$(ds_owner_of "$ROOT/data")"
if ds_has_unit && systemctl is-active --quiet "$DS_SERVICE"; then
  die "Xizmat ishlab turibdi. Avval to'xtating: sudo systemctl stop $DS_SERVICE" 4
fi
# Backup fayli xizmat foydalanuvchisi o'qiy oladigan joyda bo'lishi kerak: vaqtincha nusxa olinadi.
TMP="$ROOT/data/runtime/.restore.$$.dsbak"
cp "$IN" "$TMP"; chown "$SVC_USER" "$TMP"; chmod 600 "$TMP"
PF="$(ds_passphrase_file "$ROOT" "$SVC_USER")"
trap 'rm -f "$PF" "$TMP"' EXIT
ARGS=(restore --root "$ROOT" --in "$TMP" --passphrase-file "$PF")
[ "$FORCE" -eq 0 ] || ARGS+=(--force)
ds_as_user "$SVC_USER" "$(ds_exe "$ROOT" "$VER")" "${ARGS[@]}"
say "Tiklandi. Ishga tushirish: sudo systemctl start $DS_SERVICE  (server kutish rejimida boshlanadi)"
