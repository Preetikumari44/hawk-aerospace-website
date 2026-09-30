# Booking site deployment — `http://<ec2-ip>:8083`

Deploys the Next.js SSR app in this repo to the shared EC2 box.
Two equivalent methods: `deploy-site.ps1` (from your PC)
or the `Deploy Site` GitHub Actions workflow (on push to
`hawk-aerospace-website`).

## Port map (do not reuse)

| Port | Service | Manager |
|---|---|---|
| 3000 | NestJS backend (`main`) | PM2 |
| 3001 | 360 backend | PM2 |
| **3002** | **this site, internal (`next start`)** | **PM2 `hawk-newsite`** |
| 8081 | user site (static) | nginx |
| 8082 | 360 frontend (static) | nginx |
| **8083** | **this site, public** | **nginx → 127.0.0.1:3002** |

## One-time prerequisites

1. **AWS security group**: open inbound TCP **8083** (customize via `-FrontPort` / `vars.FRONT_PORT`, and mirror it in `nginx-hawk-newsite.conf`).
2. **Firebase console** → Authentication → Settings → Authorized domains → add
   your EC2 public IP. Without this, phone OTP fails on the new endpoint.
3. **Server**: Node 22+, PM2, nginx (already present; the scripts assert Node).
4. **CI only**: the SuperApp repo already has `DEPLOY_KEY`, `DEPLOY_USER`,
   `DEPLOY_HOST` and `REACT_APP_GOOGLE_MAPS_API_KEY` (reused as the Maps
   key). Add repo secrets `RAZORPAY_KEY_ID`, `FIREBASE_API_KEY`,
   `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`,
   `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`,
   `FIREBASE_APP_ID`, `FIREBASE_MEASUREMENT_ID`
   (optional vars: `API_BASE_URL`, `FRONT_PORT`, `NEXT_PORT`).

## Method A — from your PC

```powershell
powershell -ExecutionPolicy Bypass -File deploy\deploy-site.ps1
```

No secrets in the command: every value resolves from explicit parameters
first, then from your git-ignored project `.env.local`
(`DEPLOY_PUBLIC_IP` / `DEPLOY_SSH_KEY` / `NEXT_PUBLIC_*` — see
`.env.example`). Override anything inline, e.g.
`-PublicIp "1.2.3.4" -RazorpayKeyId "rzp_test_..."`.
`.env.local` itself is never uploaded — production env is generated as
`.env.production` on the server from the resolved values and deleted
locally right after upload. Add `-SkipBackendCorsUpdate` to leave
`~/hawk-backend/.env` and the `main` process untouched (otherwise the
script appends the new origin to the backend `CORS_ORIGIN` and
restarts `main`).

### Why keys travel with the deploy at all

Every variable here starts with `NEXT_PUBLIC_`, which Next.js **inlines
into the browser JavaScript at `npm run build` time**. The browser never
reads any env file on the server, so the values must exist wherever the
build runs (the EC2 box). Ordinary server-only variables would be read at
request time instead — but this app has none; everything is `NEXT_PUBLIC_`.

### Option B — server-owned env (no keys in any deploy)

Create the file **once** via ssh, then every deploy reuses it:

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@<EC2-IP>
cat > ~/hawk-newsite/.env.production <<'EOF'
NEXT_PUBLIC_API_BASE_URL=http://<EC2-IP>:3000/api
NEXT_PUBLIC_API_FALLBACK_URL=
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<project>.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<app-id>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<measurement-id>
NEXT_PUBLIC_FIREBASE_TEST_MODE=
NEXT_PUBLIC_RAZORPAY_KEY_ID=<razorpay-key-id>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<google-maps-key>
EOF
chmod 600 ~/hawk-newsite/.env.production
```

Then deploy with `-UseServerEnv` (script) or set repo variable
`USE_SERVER_ENV=1` (workflow) — no keys are written, uploaded, or cleaned
up; the server build reads the file in place. Changing a key later means
editing that one file + redeploying (a rebuild is required — baked-in
values can't refresh without one). Name it exactly `.env.production`:
a stray `.env.local` in that directory would shadow it with stale values.

## Method B — GitHub Actions

Push to `main` with changes under `Website/**` (or run `Deploy Website`
manually). Same steps as the script, driven by
`deploy/server-setup-newsite.sh` so both methods stay identical. Secrets
come from the SuperApp repo secrets/vars only — never from files. The
workflow file lives at the SuperApp repo root
(`.github/workflows/deploy-website.yml`); a nested `Website/.github`
would be ignored by GitHub.

## Self-cleaning deploys

Every run starts with Step 1 (cleanup + preflight) before touching anything:

- **Auto-deleted**: previous run's tarball/env/nginx-conf/setup leftovers in
  `~`, this app's stale `node_modules` + `.next` (always rebuilt fresh),
  npm cache, PM2 logs (`pm2 flush`), journals capped at 50 MB, apt cache.
- **Warn-only preflight**: free MB on `/` is printed before install and
  again before build; below `MIN_FREE_MB` (default `500`, override per-run)
  it prints a loud warning naming the shortfall and continues anyway.
- **Never touched**: `/swapfile`, `~/hawk-backend/**`, APKs, kernels/headers,
  snaps, node itself, any `.env.production`. The cleanup list is an explicit
  allow-list — nothing is globbed near app data.

Still manual (by choice): old snap revisions, old kernels, EBS expansion —
see the disk notes above / the troubleshooting thread. If the preflight
warning fires, run those manual blocks before the next deploy.

## What the server script does (`server-setup-newsite.sh`)

1. Asserts Node ≥ 22. 2. Extracts bundle to `~/hawk-newsite` (+ env file).
3. `npm install` (full — devDeps needed for build). 4. `npm run build`
   (`NEXT_PUBLIC_*` bake in here). 5. PM2 restart-or-start
   (`next start -H 0.0.0.0 -p 3002`). 6. Installs nginx site, `nginx -t`,
   reload. 7. Backend CORS update (unless skipped). 8. Curls both endpoints.

## Verify

- `http://<EC2-IP>:8083/` loads; `/login` renders.
- Guest booking → dev login → cash payment → checks → my-bookings.
- One real-number OTP login (needs the Firebase step above).
- Server: `pm2 status`, `pm2 logs hawk-newsite`, `curl localhost:3002/login`.

## Rollback / ops

- Redeploy = re-run the script (idempotent; same PM2 process restarted).
- Roll back code: `git checkout <sha>` locally, re-run (or extend CI later).
- Never `next export` this app — API routes + `middleware.ts` require SSR.
- Razorpay **live** keys mandate HTTPS; on plain `http://IP:port` only test
  keys work. Production rupees need a domain + certbot (see the pattern in
  `Hawk-Aerosystem/deploy/nginx-hawkaerosystem.conf`).
