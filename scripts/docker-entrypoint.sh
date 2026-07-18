#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy

echo "[entrypoint] Ensuring staff accounts..."
SEED_SOFT_FAIL=1 node scripts/ensure-staff.mjs || echo "[entrypoint] ensure-staff warning (non-fatal)"

echo "[entrypoint] Starting application..."
exec node server.js
