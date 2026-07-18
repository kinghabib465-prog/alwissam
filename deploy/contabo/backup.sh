#!/usr/bin/env bash
# نسخ احتياطي لقاعدة البيانات + ملفات الرفع — أضفه لـ cron يومياً
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/alwisam}"
STAMP="$(date +%F-%H%M)"
mkdir -p "$BACKUP_DIR"

docker exec alwisam-postgres pg_dump -U "${POSTGRES_USER:-alwisam}" "${POSTGRES_DB:-alwisam_dental}" \
  | gzip > "${BACKUP_DIR}/alwisam-${STAMP}.sql.gz"

# مجلد uploads داخل حاوية التطبيق (volume uploads_data)
if docker ps --format '{{.Names}}' | grep -q '^alwisam-app$'; then
  docker run --rm \
    --volumes-from alwisam-app \
    -v "${BACKUP_DIR}:/backup" \
    alpine:3.20 \
    tar czf "/backup/alwisam-uploads-${STAMP}.tar.gz" -C /app uploads 2>/dev/null \
    || echo "[backup] uploads archive skipped (empty or missing)"
fi

find "$BACKUP_DIR" -name 'alwisam-*.sql.gz' -mtime +14 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name 'alwisam-uploads-*.tar.gz' -mtime +14 -delete 2>/dev/null || true
echo "Backup saved: ${BACKUP_DIR}/alwisam-${STAMP}.sql.gz"
