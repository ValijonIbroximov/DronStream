#!/usr/bin/env bash
# systemd xizmatini to'xtatadi va olib tashlaydi. Dastur fayllari, konfiguratsiya, baza, media va backuplar O'CHIRILMAYDI.
#
# Ishlatish:   sudo bash scripts/uninstall-service.sh
. "$(dirname "${BASH_SOURCE[0]}")/ds-env.sh"
case "${1:-}" in -h|--help) sed -n '2,4p' "$0"; exit 0 ;; esac
ds_need_root "$@"
if ! ds_has_unit; then say "systemd unit yo'q ($DS_UNIT) - hech narsa qilinmadi"; exit 0; fi
systemctl stop "$DS_SERVICE" 2>/dev/null || true
systemctl disable "$DS_SERVICE" 2>/dev/null || true
rm -f "$DS_UNIT"
systemctl daemon-reload
say "Xizmat olib tashlandi. Ma'lumotlar joyida qoldi. Xizmat foydalanuvchisi ham o'chirilmadi."
