#!/usr/bin/env bash
# CI: bash skriptlari sintaksisi va satr oxirlari (CRLF bo'lmasligi kerak).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
for f in packaging/linux/build-package.sh packaging/linux/scripts/*.sh tests/ci/*.sh; do bash -n "$f"; done
if grep -rlI $'\r' packaging/linux tests/ci/*.sh; then
  echo "::error title=check-scripts::CRLF satr oxiri topildi"
  exit 1
fi
echo "bash skriptlari: sintaksis va satr oxirlari joyida"
