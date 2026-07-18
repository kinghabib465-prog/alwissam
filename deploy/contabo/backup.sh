#!/usr/bin/env bash
# نسخ احتياطي لقاعدة البيانات — أضفه لـ cron يومياً
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/alwisam}"
STAMP="$(date +%F-%H%M)"
mkdir -p "$BACKUP_DIR"

docker exec alwisam-postgres pg_dump -U "${POSTGRES_USER:-alwisam}" "${POSTGRES_DB:-alwisam_dental}" \
  | gzip > "${BACKUP_DIR}/alwisam-${STAMP}.sql.gz"

find "$BACKUP_DIR" -name 'alwisam-*.sql.gz' -mtime +14 -delete 2>/dev/null || true
echo "Backup saved: ${BACKUP_DIR}/alwisam-${STAMP}.sql.gz"
