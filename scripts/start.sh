#!/usr/bin/env bash
# Starts MySQL, the three backends and the website, in dependency order (Compose health checks).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || { cp .env.example .env; echo "Created .env from .env.example. Edit the CHANGE_ME values, then run this script again."; exit 1; }
if grep -q "CHANGE_ME" .env; then echo "Replace every CHANGE_ME value in .env first."; exit 1; fi
docker compose --profile mail-dev up -d --build
echo "Website:  http://localhost:${FRONTEND_HOST_PORT:-3000}"
echo "Mail UI:  http://localhost:8025 (only with the Mailpit sink)"
docker compose ps
