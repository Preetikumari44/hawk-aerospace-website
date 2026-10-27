#!/usr/bin/env bash
# Hawk-AeroSpace-Corrected — server-side setup for instance2 (i-06ca0e0724641ecc2).
# Runs ON instance2 (Ubuntu, via Session Manager or SSH). Deploys:
#   A) compose stack: mysql:3307 + contact:8081 + career:8082 + distributor:8083
#      (127.0.0.1 only) + frontend:3000 (127.0.0.1 only)  [Java/NEW_API]
#   B) prod Nest copy: ~/hawk-backend-prod :3001 (FIREBASE_DATABASE_ID=hawk-prod,
#      MONGODB disabled, Firestore-only) + PM2 hawk-backend-prod  [USER_API/prod]
#   C) nginx hawkaerosystem.com:80/443 -> :3000, /api/ -> :3001 (same origin).
# Instance1 (i-04c7783265d513cee: test backend :3000 + Admin + Website) untouched.
#
# Required env: DOMAIN (hawkaerosystem.com), FRONTEND_PORT (3000),
#   SERVER_DIR (default ~/hawk-corrected), BACKEND_DIR (default ~/hawk-backend-prod).
# Secrets are NEVER uploaded: ~/hawk-corrected/.env (compose) and
# ~/hawk-backend-prod/.env (prod Nest) must already exist (see README §4).
set -e
SERVER_DIR="${SERVER_DIR:-$HOME/hawk-corrected}"
BACKEND_DIR="${BACKEND_DIR:-$HOME/hawk-backend-prod}"
DOMAIN="${DOMAIN:-hawkaerosystem.com}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-3001}"

echo "==> 1/7 Disk + runtime preflight..."
df -h / | tail -1
docker --version
docker compose version
node -v  # need >= 22 (backend build)
[ "$(node -p "process.versions.node.split('.')[0]")" -ge 22 ] || { echo "Node 22+ required" >&2; exit 1; }
command -v pm2 >/dev/null || npm i -g pm2

echo "==> 2/7 Extracting bundles..."
mkdir -p "$SERVER_DIR" "$BACKEND_DIR"
tar -xzf ~/hawk-corrected.tar.gz -C "$SERVER_DIR"
tar -xzf ~/hawk-backend-prod.tar.gz -C "$BACKEND_DIR"
# Tarballs pack the top-level folder (Hawk-AeroSpace-Corrected/, Backend/):
# normalize so compose + backend paths are predictable.
if [ -f "$SERVER_DIR/Hawk-AeroSpace-Corrected/docker-compose.yml" ]; then
  COMPOSE_DIR="$SERVER_DIR/Hawk-AeroSpace-Corrected"
else
  COMPOSE_DIR="$SERVER_DIR"
fi
if [ -f "$BACKEND_DIR/Backend/package.json" ]; then
  BACKEND_SRC="$BACKEND_DIR/Backend"
else
  BACKEND_SRC="$BACKEND_DIR"
fi
# Server secrets live OUTSIDE the code tree (never in tarballs) — symlink in.
[ -f "$SERVER_DIR/.env" ] || { echo "ERROR: $SERVER_DIR/.env missing (compose secrets). See README §4." >&2; exit 1; }
[ -f "$BACKEND_DIR/.env" ] || { echo "ERROR: $BACKEND_DIR/.env missing (prod Nest secrets). See README §4." >&2; exit 1; }
ln -sf "$SERVER_DIR/.env" "$COMPOSE_DIR/.env"
cp "$BACKEND_DIR/.env" "$BACKEND_SRC/.env"
echo "COMPOSE_DIR=$COMPOSE_DIR BACKEND_SRC=$BACKEND_SRC"

echo "==> 3/7 Compose stack (mysql -> java APIs -> frontend)..."
cd "$COMPOSE_DIR"
docker compose up -d --build
docker compose ps

echo "==> 4/7 Prod Nest (hawk-prod Firestore DB + local mongo STUB for DI only)..."
# Nest injects mongo models in services: a live (near-empty) mongo must exist or
# boot stalls on reconnect retries. Data lives in Firestore hawk-prod; mongo
# holds nothing meaningful (db hawk-prod-unused, lean cache). See README §2.
docker run -d --name mongo-prod --restart unless-stopped -p 127.0.0.1:27017:27017 \
  -v hawk_mongo_prod_data:/data/db mongo:7 --wiredTigerCacheSizeGB 0.25 --oplogSize 64 --quiet 2>/dev/null \
  || docker start mongo-prod 2>/dev/null || true
cd "$BACKEND_SRC"
npm install --no-audit --no-fund
NODE_OPTIONS=--max-old-space-size=2560 npm run build
pm2 delete hawk-backend-prod 2>/dev/null || true
# MONGODB_ENABLED=true so MongooseModule registers (DI needs DatabaseConnection);
# DATABASE_SOURCE=firestore keeps ALL data in hawk-prod Firestore.
MONGODB_ENABLED=true DATABASE_SOURCE=firestore PORT="$BACKEND_PORT" pm2 start dist/src/main.js --name hawk-backend-prod --update-env
pm2 save
for i in $(seq 1 36); do
  if curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/docs" >/dev/null 2>&1; then echo "Prod backend up."; break; fi
  sleep 5
  [ "$i" = "36" ] && echo "WARNING: prod backend not up — pm2 logs hawk-backend-prod" >&2
done

echo "==> 5/7 Waiting for frontend (up to 5 min)..."
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${FRONTEND_PORT}/login" >/dev/null 2>&1; then echo "Frontend up."; break; fi
  sleep 5
  [ "$i" = "60" ] && echo "WARNING: frontend not up — docker compose logs frontend" >&2
done

echo "==> 6/7 Nginx site for $DOMAIN (+ /api/ -> :$BACKEND_PORT)..."
sudo cp "$SERVER_DIR/frontend/deploy/nginx-hawk-corrected.conf" /etc/nginx/sites-available/hawk-corrected
sudo ln -sf /etc/nginx/sites-available/hawk-corrected /etc/nginx/sites-enabled/hawk-corrected
sudo nginx -t && sudo systemctl reload nginx

echo "==> 7/7 Cleanup + checks..."
rm -f ~/hawk-corrected.tar.gz ~/hawk-backend-prod.tar.gz ~/hawk-corrected-setup.sh
curl -s -o /dev/null -w "frontend :%{http_code}\n" "http://127.0.0.1:${FRONTEND_PORT}/login"
curl -s -o /dev/null -w "prod api :%{http_code}\n" "http://127.0.0.1:${BACKEND_PORT}/api/docs"
curl -s -o /dev/null -w "public   :%{http_code}\n" "http://127.0.0.1:${FRONTEND_PORT}/"
echo "Next: HTTPS -> sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
