#!/usr/bin/env bash
# إعداد سيرفر Contabo/Ubuntu جديد — يُشغَّل مرة واحدة كـ root
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "شغّل كـ root: sudo bash deploy/contabo/setup-server.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y ca-certificates curl git ufw

# Docker
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

systemctl enable docker
systemctl start docker

# Docker Compose plugin
if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin || true
fi

# جدار ناري
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "✓ السيرفر جاهز."
echo "  1) ارفع المشروع إلى /opt/al-wisam-dental"
echo "  2) cp deploy/contabo/.env.production.example .env && nano .env"
echo "  3) bash deploy/contabo/deploy.sh"
