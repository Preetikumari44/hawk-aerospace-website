#!/usr/bin/env bash
# Hawk booking site (Next.js SSR) — server-side steps.
# Runs ON the EC2 server. Driven entirely by env vars (see deploy-site.ps1
# and .github/workflows/deploy.yml, which both call this file).
#
# Required env:
#   NEXT_PORT        internal port for `next start` (e.g. 3002)
#   PM2_NAME         PM2 process name (e.g. hawk-newsite)
#   FRONT_PORT       public nginx port (e.g. 8083)
#   PUBLIC_IP        EC2 public IP (e.g. 1.2.3.4 — never committed; passed
#                      at deploy time from git-ignored .env.local / CI secrets)
# Optional env:
#   SERVER_DIR       default ~/hawk-newsite
#   BACKEND_CORS_UPDATE  default 1 — append frontend origin to backend CORS
#                        and restart the backend PM2 process (set 0 to skip)
#   BACKEND_ENV      default ~/hawk-backend/.env
#   PM2_BACKEND      default main
#   MIN_FREE_MB      default 500 — warn (don't abort) when free disk on /
#                        drops below this before install and before build
set -e

SERVER_DIR="${SERVER_DIR:-$HOME/hawk-newsite}"
BACKEND_ENV="${BACKEND_ENV:-$HOME/hawk-backend/.env}"
PM2_BACKEND="${PM2_BACKEND:-main}"
BACKEND_CORS_UPDATE="${BACKEND_CORS_UPDATE:-1}"
MIN_FREE_MB="${MIN_FREE_MB:-500}"

check_free_mb() {
  df --block-size=1M / | tail -1 | awk '{print $4}'
}

echo '==> 1/8  Self-cleanup + disk preflight...'
# Allow-listed, regenerable paths ONLY. Never add app data, APKs, kernels,
# headers, snaps, node, swapfile, or anything outside ~/hawk-newsite* plus
# the caches below — see deploy/README-newsite.md for the full contract.
rm -f ~/hawk-newsite.tar.gz ~/hawk-newsite.env.production \
      ~/hawk-newsite-nginx.conf ~/hawk-newsite-setup.sh
rm -rf "$SERVER_DIR/node_modules" "$SERVER_DIR/.next"
npm cache clean --force 2>/dev/null || true
pm2 flush 2>/dev/null || true
sudo journalctl --vacuum-size=50M 2>/dev/null || true
sudo apt-get clean -qq 2>/dev/null || true
FREE_MB="$(check_free_mb)"
echo "Disk free: ${FREE_MB} MB (warn below ${MIN_FREE_MB} MB)."
if [ "$FREE_MB" -lt "$MIN_FREE_MB" ]; then
  echo "WARNING: low disk space (${FREE_MB} MB < ${MIN_FREE_MB} MB) — attempting install anyway." >&2
  echo "WARNING: on ENOSPC, free space manually per deploy/README-newsite.md." >&2
fi

echo "==> 2/8  Checking Node >= 22..."
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Node 22+ required, found $(node -v). Install Node 22 first." >&2
  exit 1
fi

echo '==> 3/8  Extracting site bundle + resolving build env...'
mkdir -p "$SERVER_DIR"
tar -xzf ~/hawk-newsite.tar.gz -C "$SERVER_DIR"
# NEXT_PUBLIC_* are inlined into the JS bundle at build time, so the env
# MUST exist here before `npm run build`. Two modes (see README):
#  A. deploy uploads hawk-newsite.env.production alongside the bundle, or
#  B. server-owned: ~/hawk-newsite/.env.production was created once via ssh
#     and every deploy reuses it (nothing secret crosses the wire).
# NOTE: keep the file named .env.production — a stray .env.local in this
# directory would shadow it (Next.js cascade) with stale values.
if [ -f ~/hawk-newsite.env.production ]; then
  echo 'Using uploaded build env.'
  mv -f ~/hawk-newsite.env.production "$SERVER_DIR/.env.production"
elif [ -f "$SERVER_DIR/.env.production" ]; then
  echo 'Using server-owned .env.production.'
else
  echo "ERROR: no build env found. Either upload hawk-newsite.env.production" >&2
  echo "or pre-create $SERVER_DIR/.env.production (see deploy/README-newsite.md)." >&2
  exit 1
fi

echo '==> 4/8  Installing dependencies (includes devDeps for the build)...'
cd "$SERVER_DIR"
npm install --no-audit --no-fund

echo '==> 5/8  Building (NEXT_PUBLIC_* bake in here)...'
FREE_MB="$(check_free_mb)"
echo "Disk free before build: ${FREE_MB} MB."
if [ "$FREE_MB" -lt "$MIN_FREE_MB" ]; then
  echo "WARNING: low disk space before build (${FREE_MB} MB) — attempting anyway." >&2
fi
npm run build
# The disk on small instances is tight — drop the npm cache this install just filled.
npm cache clean --force 2>/dev/null || true

echo '==> 6/8  (Re)starting PM2...'
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME"
else
  pm2 start node_modules/next/dist/bin/next --name "$PM2_NAME" -- start -H 0.0.0.0 -p "$NEXT_PORT"
fi
pm2 save

echo '==> 7/8  Installing nginx site...'
sudo cp ~/hawk-newsite-nginx.conf /etc/nginx/sites-available/hawk-newsite
sudo ln -sf /etc/nginx/sites-available/hawk-newsite /etc/nginx/sites-enabled/hawk-newsite
sudo nginx -t && sudo systemctl reload nginx

echo '==> 8/8  Backend CORS for the new origin...'
FRONT_ORIGIN="http://${PUBLIC_IP}:${FRONT_PORT}"
if [ "$BACKEND_CORS_UPDATE" = "1" ]; then
  if [ -f "$BACKEND_ENV" ]; then
    if grep -q "$FRONT_ORIGIN" "$BACKEND_ENV"; then
      echo "Origin already in backend CORS, skipping restart."
    else
      echo "Appending $FRONT_ORIGIN to backend CORS_ORIGIN and restarting $PM2_BACKEND..."
      # Append to the existing CORS_ORIGIN line (comma-separated).
      sed -i "s|^CORS_ORIGIN=\(.*\)|CORS_ORIGIN=\1,${FRONT_ORIGIN}|" "$BACKEND_ENV"
      pm2 restart "$PM2_BACKEND"
    fi
  else
    echo "WARNING: $BACKEND_ENV not found, skipping CORS update." >&2
  fi
else
  echo "Skipped (BACKEND_CORS_UPDATE=0)."
fi

echo ''
echo '==> Verifying (retried: pm2 restart drops the listener briefly and a
cold Next.js can take a minute before accepting connections)...'
wait_for_http() { # $1=url $2=label — polls up to ~2 min, fails loudly after
  url="$1"
  label="$2"
  i=1
  while [ "$i" -le 12 ]; do
    code="$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo 000)"
    if [ "$code" = "200" ]; then
      echo "$label:200 (attempt $i)"
      return 0
    fi
    sleep 10
    i=$((i + 1))
  done
  echo "$label:FAILED last=$code" >&2
  return 1
}
wait_for_http "http://127.0.0.1:${NEXT_PORT}/login" "next "
wait_for_http "http://127.0.0.1:${FRONT_PORT}/" "nginx"
echo ''
echo "DONE. Site: http://${PUBLIC_IP}:${FRONT_PORT}/"
