#!/usr/bin/env bash
# نشر/تحديث التطبيق على Contabo
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "لم يُعثر على .env — انسخ القالب أولاً:"
  echo "  cp deploy/contabo/.env.production.example .env"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

missing=()
for key in POSTGRES_PASSWORD SESSION_SECRET CSRF_SECRET SIGNED_URL_SECRET NEXT_PUBLIC_APP_URL DOMAIN; do
  if [[ -z "${!key:-}" ]] || [[ "${!key}" == CHANGE_ME* ]]; then
    missing+=("$key")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "أكمل المتغيرات التالية في .env قبل النشر:"
  printf '  - %s\n' "${missing[@]}"
  exit 1
fi

if [[ "${NEXT_PUBLIC_APP_URL}" == http://* ]] && [[ "${COOKIE_SECURE:-true}" == "true" ]]; then
  echo "تحذير: NEXT_PUBLIC_APP_URL يستخدم HTTP — اضبط COOKIE_SECURE=false أو فعّل HTTPS."
fi

echo "[deploy] Building and starting containers..."
docker compose -f docker-compose.prod.yml pull --ignore-buildable 2>/dev/null || true
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "[deploy] Waiting for app health..."
sleep 8
if docker compose -f docker-compose.prod.yml ps --status running | grep -q alwisam-app; then
  echo "✓ التطبيق يعمل."
else
  echo "✗ تحقق من السجلات: docker compose -f docker-compose.prod.yml logs -f app"
  exit 1
fi

echo ""
echo "════════════════════════════════════════"
echo "  رابط العيادة: ${NEXT_PUBLIC_APP_URL}"
echo "  دخول الطاقم:  ${NEXT_PUBLIC_APP_URL}/staff/login"
echo "  دخول المريض:  ${NEXT_PUBLIC_APP_URL}/patient/login"
echo "════════════════════════════════════════"
echo ""
echo "سجلات مباشرة: docker compose -f docker-compose.prod.yml logs -f app"
