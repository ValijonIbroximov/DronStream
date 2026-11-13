#!/usr/bin/env bash
# Oldingi versiyaga qaytaradi.
#
# Ishlatish:   sudo bash scripts/rollback.sh --to-version <VERSIYA> [--root /opt/dronstream] [--backup FAYL.dsbak] [--same-schema]
#
# Yangi versiya bazani yangi sxemaga o'tkazgan bo'lsa, eski dastur bu bazani OCHMAYDI.
# Shuning uchun yangilashdan oldingi backup tiklanadi:
#   --backup berilmasa data/backups/pre-update-<VERSIYA>-to-*.dsbak dan eng yangisi tanlanadi;
#   --same-schema: backup tiklanmaydi (faqat sxema o'zgarmagan versiyalar orasida).
# Backupdan keyin qilingan o'zgarishlar (yangi hisoblar, havolalar, media) yo'qoladi.
. "$(dirname "${BASH_SOURCE[0]}")/ds-env.sh"

ROOT="$DS_DEFAULT_ROOT"; TO=""; BACKUP=""; SAME=0
while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="${2:-}"; shift 2 ;;
    --to-version) TO="${2:-}"; shift 2 ;;
    --backup) BACKUP="${2:-}"; shift 2 ;;
    --same-schema) SAME=1; shift ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) die "Noma'lum parametr: $1" 4 ;;
  esac
done
ds_validate_root "$ROOT"
ds_need_root "$@"
case "$TO" in *"<"*|*">"*|"") die "--to-version ko'rsatilmagan yoki <...> to'ldirilmagan" 4 ;; esac
EXE="$(ds_exe "$ROOT" "$TO")"
[ -x "$EXE" ] || die "$TO versiya fayllari yo'q: $EXE" 4
CUR="$(ds_active_version "$ROOT")"
SVC_USER="$(ds_owner_of "$ROOT/data")"

if [ -z "$BACKUP" ] && [ "$SAME" -eq 0 ]; then
  BACKUP="$(ls -1t "$ROOT"/data/backups/pre-update-"$TO"-to-*.dsbak 2>/dev/null | head -n1 || true)"
  [ -z "$BACKUP" ] || say "Yangilashdan oldingi backup topildi va tiklanadi: $(basename "$BACKUP")"
fi

ds_service_stop "$ROOT" "$SVC_USER"
ln -sfn "$TO" "$ROOT/app/current"
printf '%s\n' "$TO" > "$ROOT/app/active.txt"

if [ -n "$BACKUP" ]; then
  [ -f "$BACKUP" ] || die "Backup fayli topilmadi: $BACKUP" 4
  PF="$(ds_passphrase_file "$ROOT" "$SVC_USER")"
  trap 'rm -f "$PF"' EXIT
  if ! ds_as_user "$SVC_USER" "$EXE" restore --root "$ROOT" --in "$BACKUP" --passphrase-file "$PF" --force; then
    ln -sfn "$CUR" "$ROOT/app/current"; printf '%s\n' "$CUR" > "$ROOT/app/active.txt"
    die "Backup tiklanmadi - faol versiya $CUR ga qaytarildi (xizmat to'xtatilgan holatda: sudo systemctl start $DS_SERVICE)"
  fi
  # Shu serverning o'zida qaytarish: "eski server" - shu server, shuning uchun darhol faollashtiriladi.
  ds_as_user "$SVC_USER" "$EXE" activate --root "$ROOT" >/dev/null
fi

ds_service_start
if ds_wait_healthy "$ROOT" "$SVC_USER" 60; then
  say "Rollback tayyor: $TO ishlayapti"
else
  warn "Rollbackdan keyin sog'lom emas. Logda 'schema ... is newer' bo'lsa baza yangi sxemada: mos --backup bilan qayta urining."
  say "Log: sudo journalctl -u $DS_SERVICE -n 50 --no-pager"
  exit 1
fi
