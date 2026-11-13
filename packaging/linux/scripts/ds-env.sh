# DronStream: Linux skriptlari uchun umumiy funksiyalar (source qilinadi, o'zi ishga tushirilmaydi).
# Qo'llab-quvvatlanadigan yo'l: Ubuntu Server 26.04 LTS / 24.04 LTS, amd64, systemd.
set -euo pipefail

DS_DEFAULT_ROOT="/opt/dronstream"
DS_DEFAULT_USER="dronstream"
DS_SERVICE="dronstream"
DS_UNIT="/etc/systemd/system/${DS_SERVICE}.service"

say()  { printf '%s\n' "$*"; }
step() { printf '==> %s\n' "$*"; }
warn() { printf 'OGOHLANTIRISH: %s\n' "$*" >&2; }
die()  { printf 'XATO: %s\n' "$1" >&2; exit "${2:-1}"; }

# Paket ildizi: shu fayl <paket>/scripts/ ichida turadi.
ds_pkg_dir() { (cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd); }

ds_need_root() {
  [ "$(id -u)" -eq 0 ] || die "Bu amal root huquqini talab qiladi. Qayta ishga tushiring: sudo bash $0 $*" 4
}

# ROOT to'ldirilmagan (placeholder) yoki tizim papkasi bo'lsa hech narsa qilinmaydi.
ds_validate_root() {
  local r="$1"
  case "$r" in
    *"<"*|*">"*|"") die "ROOT ko'rsatilmagan yoki namunadagi <...> to'ldirilmagan: '$r'" 4 ;;
  esac
  case "$r" in
    /*) ;;
    *) die "ROOT mutlaq yo'l bo'lishi kerak (masalan $DS_DEFAULT_ROOT): '$r'" 4 ;;
  esac
  case "${r%/}" in
    ""|/bin|/boot|/dev|/etc|/home|/lib|/lib64|/proc|/root|/run|/sbin|/sys|/tmp|/usr|/var|/opt|/srv)
      die "ROOT sifatida tizim papkasining o'zi ishlatilmaydi: '$r' (masalan $DS_DEFAULT_ROOT)" 4 ;;
  esac
}

ds_validate_user() {
  case "$1" in
    *"<"*|*">"*|"") die "Xizmat foydalanuvchisi ko'rsatilmagan yoki <...> to'ldirilmagan: '$1'" 4 ;;
    root) die "Xizmat root sifatida ishlamaydi: alohida huquqsiz hisob kerak (odatda '$DS_DEFAULT_USER')" 4 ;;
  esac
  printf '%s' "$1" | grep -Eq '^[a-z_][a-z0-9_-]{0,31}$' || die "Foydalanuvchi nomi yaroqsiz: '$1'" 4
}

ds_active_version() {
  local f="$1/app/active.txt"
  [ -f "$f" ] || { printf ''; return 0; }
  tr -d '[:space:]' < "$f"
}

ds_exe() { printf '%s/app/%s/dronstream' "$1" "$2"; }

# SHA256SUMS.txt bo'yicha paket yaxlitligi (Windows paketi bilan bir xil format: "<hash>  <nisbiy yo'l>").
ds_verify_package() {
  local pkg="$1" bad=0 h rel p
  [ -f "$pkg/SHA256SUMS.txt" ] || die "Paketda SHA256SUMS.txt yo'q: $pkg"
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    h="${line%%  *}"; rel="${line#*  }"
    p="$pkg/$rel"
    if [ ! -f "$p" ]; then say "  yo'q: $rel"; bad=1; continue; fi
    if [ "$(sha256sum "$p" | cut -d' ' -f1)" != "$h" ]; then say "  o'zgargan: $rel"; bad=1; fi
  done < "$pkg/SHA256SUMS.txt"
  [ "$bad" -eq 0 ] || die "Paket fayllari buzilgan yoki yetishmaydi. Paketni qayta yuklab oling."
}

# Dastur buyruqlarini xizmat foydalanuvchisi nomidan bajarish (fayllar root egaligida qolib ketmasin).
ds_as_user() {
  local user="$1"; shift
  if [ "$(id -un)" = "$user" ]; then "$@"; else runuser -u "$user" -- "$@"; fi
}

ds_owner_of() { stat -c '%U' "$1"; }

ds_healthy() { ds_as_user "$2" "$1/app/current/dronstream" status --root "$1" >/dev/null 2>&1; }

ds_wait_healthy() {
  local root="$1" user="$2" n="${3:-60}" i
  for i in $(seq 1 "$n"); do
    if ds_healthy "$root" "$user"; then return 0; fi
    sleep 1
  done
  return 1
}

ds_has_unit() { [ -f "$DS_UNIT" ]; }

ds_service_stop() {
  local root="$1" user="$2"
  if ds_has_unit && systemctl is-active --quiet "$DS_SERVICE"; then
    systemctl stop "$DS_SERVICE"
  elif ds_healthy "$root" "$user"; then
    ds_as_user "$user" "$root/app/current/dronstream" stop --root "$root" || true
  fi
}

ds_service_start() {
  ds_has_unit || die "systemd unit o'rnatilmagan ($DS_UNIT). Avval: sudo bash scripts/install.sh"
  systemctl start "$DS_SERVICE"
}

# Backup parolini fayl orqali uzatadi: parol jarayon argumentlarida (ps) va logda ko'rinmaydi.
# Manba: DRONSTREAM_BACKUP_PASSPHRASE muhit o'zgaruvchisi yoki klaviaturadan (ekranda ko'rinmaydi).
ds_passphrase_file() {
  local root="$1" user="$2" confirm="${3:-}" pass="${DRONSTREAM_BACKUP_PASSPHRASE:-}" again f
  if [ -z "$pass" ]; then
    [ -t 0 ] || die "Backup paroli berilmagan: DRONSTREAM_BACKUP_PASSPHRASE o'rnating yoki skriptni terminalda ishga tushiring" 4
    read -r -s -p "Backup paroli: " pass; printf '\n' >&2
    if [ -n "$confirm" ]; then
      read -r -s -p "Parolni takrorlang: " again; printf '\n' >&2
      [ "$pass" = "$again" ] || die "Parollar mos emas" 4
    fi
  fi
  [ "${#pass}" -ge 12 ] || die "Backup paroli kamida 12 belgi bo'lishi kerak" 4
  f="$root/data/runtime/.passphrase.$$"
  ( umask 077; printf '%s' "$pass" > "$f" )
  chown "$user" "$f" 2>/dev/null || true
  printf '%s' "$f"
}
