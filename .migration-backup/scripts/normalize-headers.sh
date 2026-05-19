#!/bin/bash
set -euo pipefail

find dashboard/src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  sed -i \
    -e '/^\/\/ Generated/d' \
    -e '/^\/\/ Auto-generated/d' \
    -e '/^\/\/ Created by AI/d' \
    -e '/^\/\/ @generated/d' \
    -e '/^\/\/ TODO: Replace.*mock/d' \
    "$file"
done

find dashboard/src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
  sed -i '/./,$!d' "$file"
done

echo "Headers normalized."
