#!/usr/bin/env bash
# DronStream preflight: serverni FAQAT O'QIB tekshiradi. Hech narsani o'zgartirmaydi, o'rnatmaydi, to'xtatmaydi.
#
# Ishlatish:   bash scripts/preflight.sh [--root /opt/dronstream]
#   (root shart emas; sudo bilan ishga tushirilsa port egalari va firewall holati to'liqroq ko'rinadi)
# Chiqish kodi: 0 = to'siq yo'q, 4 = o'rnatishdan oldin hal qilinishi kerak bo'lgan to'siq bor.
. "$(dirname "${BASH_SOURCE[0]}")/ds-env.sh"

ROOT="$DS_DEFAULT_ROOT"
while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,7p' "$0"; exit 0 ;;
    *) die "Noma'lum parametr: $1" 4 ;;
  esac
done
ds_validate_root "$ROOT"

BLOCK=(); WARN=()
block() { BLOCK+=("$1"); }
note()  { WARN+=("$1"); }

step "1. Operatsion tizim va arxitektura"
OS_ID="?"; OS_VER="?"; OS_NAME="?"
if [ -r /etc/os-release ]; then
  # shellcheck disable=SC1091
  OS_ID="$(. /etc/os-release; printf '%s' "${ID:-?}")"
  OS_VER="$(. /etc/os-release; printf '%s' "${VERSION_ID:-?}")"
  OS_NAME="$(. /etc/os-release; printf '%s' "${PRETTY_NAME:-?}")"
fi
ARCH="$(uname -m)"
say "  Tizim: $OS_NAME | yadro: $(uname -r) | arxitektura: $ARCH"
[ "$(uname -s)" = "Linux" ] || block "Bu skript Linux uchun. Windows Server uchun INSTALL_UZ.md va scripts\\install.ps1 dan foydalaning."
[ "$ARCH" = "x86_64" ] || block "Paket amd64 (x86_64) uchun yig'ilgan; bu server: $ARCH."
case "$OS_ID:$OS_VER" in
  ubuntu:26.04|ubuntu:24.04) say "  Qo'llab-quvvatlanadigan yo'l: Ubuntu Server $OS_VER LTS" ;;
  *) note "Bu distributiv ($OS_ID $OS_VER) DronStream uchun sinalmagan. Qo'llab-quvvatlanadigan yo'l: Ubuntu Server 26.04 LTS yoki 24.04 LTS." ;;
esac
if command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
  say "  systemd: bor"
else
  block "systemd topilmadi: avtomatik ishga tushirish (dronstream.service) ishlamaydi."
fi

step "2. Resurslar"
CPUS="$(nproc 2>/dev/null || echo '?')"
MEM_MB="$(awk '/MemTotal/ {printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || echo 0)"
say "  Mantiqiy yadrolar: $CPUS | RAM: ${MEM_MB} MB"
[ "${MEM_MB:-0}" -ge 2000 ] || note "RAM 2 GB dan kam: bir nechta stream va tomoshabin uchun yetmasligi mumkin."
PARENT="$ROOT"; while [ ! -d "$PARENT" ]; do PARENT="$(dirname "$PARENT")"; done
FREE_MB="$(df -Pm "$PARENT" | awk 'NR==2 {print $4}')"
say "  Disk ($PARENT): ${FREE_MB} MB bo'sh"
[ "${FREE_MB:-0}" -ge 2048 ] || note "$PARENT da 2 GB dan kam joy: media, backup va loglar uchun yetmasligi mumkin."

step "3. Tarmoq manzillari (faqat ko'rsatish)"
if command -v ip >/dev/null 2>&1; then
  ip -brief -4 addr show scope global 2>/dev/null | sed 's/^/  /' || true
  say "  Standart yo'l: $(ip -4 route show default 2>/dev/null | head -n1 || true)"
else
  note "'ip' buyrug'i yo'q (iproute2): manzillar ko'rsatilmadi."
fi
say "  Eslatma: iDRAC (BMC) alohida boshqaruv porti va manzili - u bu ro'yxatga kirmaydi va DronStream portlari bilan bog'liq emas."

step "4. DronStream portlari band emasligi"
# name proto port scope  (standart konfiguratsiya; config/dronstream.yaml da o'zgartirilgan bo'lsa shu faylga qarang)
PORTS="HTTPS:tcp:8443:tashqi WebRTC-media:udp:8189:tashqi RTMP-ingest:tcp:1935:cheklangan ichki-hook:tcp:9180:loopback MediaMTX-API:tcp:9997:loopback MediaMTX-WHEP:tcp:8889:loopback"
if [ -f "$ROOT/config/dronstream.yaml" ]; then
  say "  ($ROOT/config/dronstream.yaml mavjud: portlar o'sha faylda o'zgartirilgan bo'lishi mumkin; quyida standart portlar tekshiriladi)"
fi
if command -v ss >/dev/null 2>&1; then
  for e in $PORTS; do
    IFS=: read -r name proto port scope <<<"$e"
    if [ "$proto" = "udp" ]; then line="$(ss -H -lunp 2>/dev/null | awk -v p=":$port" '$4 ~ p"$"' | head -n1 || true)"
    else line="$(ss -H -ltnp 2>/dev/null | awk -v p=":$port" '$4 ~ p"$"' | head -n1 || true)"; fi
    if [ -n "$line" ]; then
      owner="$(printf '%s' "$line" | grep -o 'users:.*' || echo "egasi ko'rinmadi (sudo bilan qayta ishga tushiring)")"
      case "$owner" in
        *dronstream*|*mediamtx*) say "  $name $port/$proto: DronStream o'zi tinglayapti" ;;
        *) block "$name $port/$proto band: $owner. Begona xizmat to'xtatilmaydi: config/dronstream.yaml da boshqa port tanlang." ;;
      esac
    else
      say "  $name $port/$proto ($scope): bo'sh"
    fi
  done
  N_LISTEN="$(ss -H -ltn 2>/dev/null | wc -l | tr -d ' ')"
  say "  Serverda hozir $N_LISTEN ta TCP tinglovchi bor (mavjud xizmatlar). Ular o'zgartirilmaydi."
else
  note "'ss' buyrug'i yo'q (iproute2): portlar tekshirilmadi."
fi

step "5. Firewall holati (faqat ko'rsatish)"
if command -v ufw >/dev/null 2>&1; then
  if [ "$(id -u)" -eq 0 ]; then ufw status | sed 's/^/  /'
  else say "  ufw o'rnatilgan; holatini ko'rish uchun: sudo ufw status verbose"; fi
else
  say "  ufw o'rnatilmagan. Boshqa firewall (nftables/firewalld yoki tashqi qurilma) ishlatilayotgan bo'lishi mumkin."
fi

step "6. Vaqt"
if command -v timedatectl >/dev/null 2>&1; then
  SYNC="$(timedatectl show -p NTPSynchronized --value 2>/dev/null || echo '?')"
  say "  UTC vaqt: $(date -u '+%Y-%m-%d %H:%M:%S') | NTP sinxron: $SYNC"
  [ "$SYNC" = "yes" ] || note "Soat NTP bilan sinxron emas: havola muddatlari va sertifikat tekshiruvi noto'g'ri ishlashi mumkin."
fi

step "7. Mavjud o'rnatish"
if [ -d "$ROOT/app" ]; then
  say "  $ROOT da o'rnatish bor; faol versiya: $(ds_active_version "$ROOT")"
  say "  Yangi versiya uchun install.sh emas, yangi paketdagi update.sh ishlatiladi."
else
  say "  $ROOT da o'rnatish yo'q."
fi
if ds_has_unit; then say "  systemd unit bor: $DS_UNIT (holat: $(systemctl is-active "$DS_SERVICE" 2>/dev/null || true))"; fi

printf '\n'
if [ "${#WARN[@]}" -gt 0 ]; then say "OGOHLANTIRISHLAR:"; for w in "${WARN[@]}"; do say "  - $w"; done; fi
if [ "${#BLOCK[@]}" -gt 0 ]; then
  say "TO'SIQLAR (o'rnatishdan oldin hal qiling):"; for b in "${BLOCK[@]}"; do say "  - $b"; done
  exit 4
fi
say "To'siq topilmadi. Keyingi qadam: sudo bash scripts/install.sh --root $ROOT"
