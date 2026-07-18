#!/usr/bin/env bash
# توليد أسرار عشوائية لملف .env
set -euo pipefail

rand() {
  openssl rand -hex "${1:-32}"
}

echo "# أضف هذه القيم إلى .env"
echo "POSTGRES_PASSWORD=$(rand 24)"
echo "SESSION_SECRET=$(rand 32)"
echo "CSRF_SECRET=$(rand 32)"
echo "SIGNED_URL_SECRET=$(rand 32)"
