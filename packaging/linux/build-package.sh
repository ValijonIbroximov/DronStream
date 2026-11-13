#!/usr/bin/env bash
# DronStream Linux tarqatish paketini yig'adi: dist/DronStream-<versiya>-linux-amd64.tar.gz (+ .sha256)
#
# Ishlatish:   bash packaging/linux/build-package.sh <versiya> [--force]
#
# Linux'da ham, Windows'da Git Bash ostida ham ishlaydi (Windows'da cross-compile: Linux fayllari
# faqat yig'iladi, ishga tushirilmaydi). Faqat ishlab chiquvchi uchun; serverga Go/Node kerak emas.
# Talab: Go (.tools/go yoki PATH), yig'ilgan frontend (backend/internal/webui/dist/index.html),
#        hosil qilingan info.html (node guide/build.mjs).
# Mavjud paket ustidan yozilmaydi (--force bo'lmasa): chiqarilgan versiyalar o'zgarmaydi.
set -euo pipefail

VERSION="${1:-}"; [ $# -gt 0 ] && shift
FORCE=0
for a in "$@"; do case "$a" in --force) FORCE=1 ;; *) echo "Noma'lum parametr: $a" >&2; exit 2 ;; esac; done
if ! printf '%s' "$VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+([-.][A-Za-z0-9.]+)?$'; then
  echo "Ishlatish: bash packaging/linux/build-package.sh <versiya, masalan 1.2.0> [--force]" >&2; exit 2
fi
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOOLS="$REPO/.tools"
MTX_VERSION="v1.21.3"
MTX_SHA256="0a2ea7eba96023631efa1bea7804823a9145b043b6646a8a05798d4ac24ed635"   # mediamtx_v1.21.3_linux_amd64.tar.gz (GitHub release checksums.sha256)
NAME="DronStream-$VERSION-linux-amd64"
STAGE="$REPO/dist/$NAME"
OUT="$REPO/dist/$NAME.tar.gz"
step() { printf '==> %s\n' "$*"; }
sha_of() { sha256sum < "$1" | cut -d' ' -f1; }

if [ -e "$OUT" ] && [ "$FORCE" -eq 0 ]; then
  echo "XATO: $OUT allaqachon mavjud. Chiqarilgan paket ustidan yozilmaydi (yangi versiya raqami bering yoki --force)." >&2; exit 3
fi

# --- toolchain: pinned one in .tools when present (developer PC), otherwise PATH (CI) ---
if [ -d "$TOOLS/go/bin" ]; then
  export GOROOT="$TOOLS/go" GOPATH="$TOOLS/gopath" GOCACHE="$TOOLS/gocache"
  PATH="$TOOLS/go/bin:$PATH"
fi
command -v go >/dev/null 2>&1 || { echo "XATO: Go topilmadi (.tools/go yoki PATH)" >&2; exit 1; }
export CGO_ENABLED=0 GOTELEMETRY=off

[ -f "$REPO/backend/internal/webui/dist/index.html" ] || { echo "XATO: frontend yig'ilmagan (backend/internal/webui/dist/index.html yo'q). Avval DronStreamTayyorla yoki build.ps1." >&2; exit 1; }
if [ -f "$REPO/guide/build.mjs" ] && [ ! -f "$REPO/info.html" ]; then echo "XATO: info.html yo'q. Avval: node guide/build.mjs" >&2; exit 1; fi

# --- MediaMTX for Linux: download once, verify the pinned checksum ---
MTX_DIR="$TOOLS/mediamtx-linux"
if [ ! -f "$MTX_DIR/mediamtx" ] || [ "$(cat "$MTX_DIR/.verified" 2>/dev/null || true)" != "$MTX_SHA256" ]; then
  step "MediaMTX $MTX_VERSION (linux/amd64) yuklab olinmoqda"
  mkdir -p "$TOOLS/dl" "$MTX_DIR"
  TGZ="$TOOLS/dl/mediamtx_${MTX_VERSION}_linux_amd64.tar.gz"
  if [ ! -f "$TGZ" ] || [ "$(sha_of "$TGZ")" != "$MTX_SHA256" ]; then
    curl -fsSL -o "$TGZ" "https://github.com/bluenviron/mediamtx/releases/download/$MTX_VERSION/mediamtx_${MTX_VERSION}_linux_amd64.tar.gz"
  fi
  GOT="$(sha_of "$TGZ")"
  [ "$GOT" = "$MTX_SHA256" ] || { rm -f "$TGZ"; echo "XATO: MediaMTX SHA256 mos emas: $GOT" >&2; exit 1; }
  tar -xzf "$TGZ" -C "$MTX_DIR" mediamtx LICENSE
  printf '%s' "$MTX_SHA256" > "$MTX_DIR/.verified"
fi

step "dronstream (linux/amd64) yig'ilmoqda: $VERSION"
rm -rf "$STAGE"
mkdir -p "$STAGE/app/$VERSION/mediamtx" "$STAGE/config" "$STAGE/docs" "$STAGE/scripts"
( cd "$REPO/backend" && GOOS=linux GOARCH=amd64 go build -trimpath -ldflags "-s -w -X main.version=$VERSION" -o "$STAGE/app/$VERSION/dronstream" ./cmd/dronstream )

step "Paket yig'ilmoqda"
cp "$MTX_DIR/mediamtx" "$STAGE/app/$VERSION/mediamtx/mediamtx"
cp "$MTX_DIR/LICENSE" "$STAGE/app/$VERSION/mediamtx/LICENSE-mediamtx.txt"
cp "$REPO/config/dronstream.example.yaml" "$STAGE/config/"
if [ -f "$REPO/info.html" ]; then cp "$REPO/info.html" "$STAGE/"; fi
for d in README_UZ.md SERVER_INSTALL_UZ.md REQUIREMENTS.md PROGRESS.md ADMIN_GUIDE_UZ.md DJI_SETUP_UZ.md SECURITY.md BACKUP_RESTORE_UZ.md INSTALL_UZ.md TEST_REPORT.md ARCHITECTURE.md; do
  if [ -f "$REPO/$d" ]; then cp "$REPO/$d" "$STAGE/docs/"; fi
done
# Scripts must have LF line endings whatever the checkout produced.
for f in "$REPO"/packaging/linux/scripts/*; do tr -d '\r' < "$f" > "$STAGE/scripts/$(basename "$f")"; done
printf '%s\n' "$VERSION" > "$STAGE/VERSION"
( cd "$STAGE" && find . -type f ! -name SHA256SUMS.txt | LC_ALL=C sort | while IFS= read -r f; do printf '%s  %s\n' "$(sha_of "$f")" "${f#./}"; done > SHA256SUMS.txt )

# --- tar.gz with explicit Unix modes (a Windows build host has no meaningful modes) ---
cd "$REPO/dist"
LIST="$(mktemp -d)"
find "$NAME" -type d | LC_ALL=C sort > "$LIST/dirs"
{ printf '%s\n' "$NAME/app/$VERSION/dronstream" "$NAME/app/$VERSION/mediamtx/mediamtx"; find "$NAME/scripts" -type f -name '*.sh'; } | LC_ALL=C sort > "$LIST/exec"
find "$NAME" -type f | LC_ALL=C sort | grep -vxF -f "$LIST/exec" > "$LIST/files"
TAR="$NAME.tar"
rm -f "$TAR" "$TAR.gz"
COMMON=(--owner=0 --group=0 --numeric-owner --format=gnu)
tar "${COMMON[@]}" --no-recursion --mode=0755 -cf "$TAR" -T "$LIST/dirs"
tar "${COMMON[@]}" --mode=0644 -rf "$TAR" -T "$LIST/files"
tar "${COMMON[@]}" --mode=0755 -rf "$TAR" -T "$LIST/exec"
gzip -9n "$TAR"
rm -rf "$LIST"
# self-check: executables really carry the executable bit inside the archive
for f in "$NAME/app/$VERSION/dronstream" "$NAME/app/$VERSION/mediamtx/mediamtx" "$NAME/scripts/install.sh"; do
  tar -tvzf "$OUT" "$f" | grep -q '^-rwxr-xr-x' || { echo "XATO: arxivda $f bajariladigan emas" >&2; exit 1; }
done
printf '%s  %s\n' "$(sha_of "$OUT")" "$NAME.tar.gz" > "$OUT.sha256"
step "Tayyor: $OUT"
echo "SHA256: $(cut -d' ' -f1 < "$OUT.sha256")"
