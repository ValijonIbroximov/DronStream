#!/usr/bin/env bash
# CI: qo'llanma manbasi (guide/src) va hosil qilingan fayllar (info.html, admin yordam) bir xilligini tekshiradi.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
if [ ! -f guide/src/guide.md ]; then echo "qo'llanma manbasi yo'q - o'tkazib yuborildi"; exit 0; fi
if ! node guide/build.mjs --check; then
  echo "::error title=check-guide::info.html yoki admin yordam fayllari manbadan eskirgan (node guide/build.mjs)"
  exit 1
fi
