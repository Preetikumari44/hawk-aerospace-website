# Deploy Corrected → https://hawkaerosystem.com (instance2) + prod backend copy (hawk-prod)

`Hawk-AeroSpace-Corrected` (compose: mysql + 3 Java APIs + Next.js) + an **exact copy of `Hawk-Aerosystem\Backend`** (prod Nest `:3001`, `FIREBASE_DATABASE_ID=hawk-prod`, EMPTY Firestore DB, Firestore-only — **no MongoDB**) run on **instance2 `i-06ca0e0724641ecc2`**. Browser calls **same-origin** `https://hawkaerosystem.com/api/*` → prod Nest. **Instance1 `i-04c7783265d513cee`** (test Nest `:3000` + Admin + Website) is untouched. Admin sees **both** via Test/Prod switcher (duplicate users expected).

## Why `NEXT_PUBLIC_API_BASE_URL=https://hawkaerosystem.com/api` (not `43.205.190.95:3000/api`)

- `43.205.190.95:3000/api` = instance1 **test** backend (test DB — that's why you saw real user details/history/roles).
- Corrected must use **prod** (`hawk-prod`, empty). The prod copy lives on instance2 at `:3001`, proxied by nginx at `/api/` on the **same domain** → no CORS, no cross-instance browser dependency, no extra SG port.
- Old value = test DB bleed. New value = prod empty DB. After switching, **logout + clear site data once** (stale test JWT in `localStorage` otherwise keeps showing test data).

## 0. Values (fill once)

```powershell
$I2_EIP = "54.x.x.x"    # instance2 EIP (step 1)
$KEY2   = "C:\path\to\instance2.pem"   # only for §5A; skip if keyless (§SSH-B)
```

## 1. EIP + DNS + SG (console, once)

1. EC2 → Elastic IPs → Allocate → Associate to `i-06ca0e0724641ecc2` → `$I2_EIP`.
2. Route53 → hosted zone `hawkaerosystem.com` → Create records:
   - `A hawkaerosystem.com → $I2_EIP`, TTL 300
   - `A www.hawkaerosystem.com → $I2_EIP`, TTL 300
3. EC2 → Security groups → **instance2 SG**: inbound `80` + `443` from `0.0.0.0/0`, `22` from your IP only. Nothing else public (`3000/3001/3307/8081-8083` stay `127.0.0.1`).
4. Check: `nslookup hawkaerosystem.com` → `$I2_EIP`.

## 2. MongoDB: local stub (verified required, holds nothing)

- Corrected compose never ran mongo (only `mysql:8.4`). Prod Nest needs a **live but near-empty** local mongo (`mongo-prod` container, `127.0.0.1:27017`, db `hawk-prod-unused`, 0.25GB cache, `server-setup-corrected.sh` creates it idempotently) because services inject mongo models — without a connection Nest stalls forever on `MongooseServerSelectionError` reconnect retries and never listens (verified on this box). A no-Mongoose code skip was tried and reverted for exactly this reason (DI needs `DatabaseConnection`); per your "keep as is if it breaks", mongo stays.
- ALL app data lives in Firestore **`hawk-prod`** (`DATABASE_SOURCE=firestore`, `FIRESTORE_SYNC_ENABLED=false`); mongo is never read meaningfully and is never split test/prod.
- Instance1 test backend: untouched.

## 3. SSH keys — you have Session Manager, no `$KEY2`

**You do NOT need a key for setup** — do everything through Session Manager:
- AWS console → EC2 → Instances → `i-06ca0e0724641ecc2` → Connect → **Session Manager** → Connect. You get a root shell, no key required. Run every `ssh ...` command below directly in that shell (drop the `ssh -i ...` prefix).

**If you still want a key (only needed for `scp`/§5A):**

Option A — create NEW key pair (old key unrecoverable by design):
```text
EC2 → Network & Security → Key Pairs → Create key pair
  Name: instance2-admin-2026  | Type: RSA  | Format: .pem (Windows) → Create
  → browser downloads instance2-admin-2026.pem ONCE (save to C:\Users\fawwa\.ssh\, never commit)
EC2 → Instances → i-06ca0e0724641ecc2 → Actions → Security → (keys are set at launch;
  a new key pair does NOT auto-attach) → instead push your PUBLIC key via Session Manager:
```
```bash
# in the Session Manager shell on instance2 (one-time):
mkdir -p ~/.ssh && chmod 700 ~/.ssh
# paste YOUR public key (from the .pem: ssh-keygen -y -f instance2-admin-2026.pem on your PC):
echo "ssh-rsa AAAA... you@pc" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
# test from PC:
ssh -i C:\Users\fawwa\.ssh\instance2-admin-2026.pem ubuntu@<I2_EIP> "echo ok"
```

Option B — EC2 Instance Connect (browser SSH, no key file):
- EC2 → Instances → `i-06ca0e0724641ecc2` → Connect → **EC2 Instance Connect** → Connect. Works if instance has EC2 Instance Connect agent + SG allows SSH from `18.206.107.24/29` (or your IP). No file to manage.

## 4. Server secrets (Session Manager shell on instance2, once — never uploaded)

```bash
# A) base packages
sudo apt update && sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx nodejs npm
node -v   # need >= 22; if older: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2
sudo usermod -aG docker ubuntu

# B) compose env (Java/MySQL) — first deploy ships .env.example; copy + edit:
ls ~/hawk-corrected/.env 2>/dev/null || echo "run §5 once, then return here"
cp ~/hawk-corrected/.env.example ~/hawk-corrected/.env
nano ~/hawk-corrected/.env
# .. replace EVERY CHANGE_ME (4 DB passwords, Gmail app password)
# .. PUBLIC_SITE_ORIGIN=https://hawkaerosystem.com

# C) prod Nest env (hawk-prod, Firestore-only). Copy keys from instance1 test backend,
#    then override DB/ports/mongo. In Session Manager on INSTANCE1 first:
cat ~/hawk-backend/.env | grep -E '^(FIREBASE_PROJECT_ID|FIREBASE_CLIENT_EMAIL|FIREBASE_PRIVATE_KEY|FIREBASE_STORAGE_BUCKET|SENDGRID|RAZORPAY|GOOGLE_MAPS|JWT)' | sed 's/=.*$/=<copy value>/'
# .. then on INSTANCE2 create ~/hawk-backend-prod/.env with those copied values PLUS:
# PORT=3001
# API_PREFIX=api
# MONGODB_ENABLED=true   (stub connection only; data stays in Firestore hawk-prod)
# DATABASE_SOURCE=firestore
# FIRESTORE_SYNC_ENABLED=false
# MONGODB_URI=mongodb://127.0.0.1:27017/hawk-prod-unused
# MONGODB_DB_NAME=hawk-prod-unused
# FIREBASE_DATABASE_ID=hawk-prod
# CORS_ORIGIN=https://hawkaerosystem.com,https://www.hawkaerosystem.com
# JWT_SECRET=<new: openssl rand -base64 48>   (differ from test)
# JWT_REFRESH_SECRET=<new: openssl rand -base64 48>
nano ~/hawk-backend-prod/.env
chmod 600 ~/hawk-corrected/.env ~/hawk-backend-prod/.env
```

## 5. Deploy

### 5A. With key (one command, from PC)

```powershell
cd C:\Users\fawwa\Documents\Hawk-Aero\Hawk-AeroSpace-Corrected
powershell -ExecutionPolicy Bypass -File frontend\deploy\deploy-corrected.ps1 -PublicIp $I2_EIP -SshKey $KEY2 -Domain hawkaerosystem.com
```

### 5B. Keyless (Session Manager + S3, exact commands)

```powershell
# PC: pack both tarballs (same excludes as §5A):
cd C:\Users\fawwa\Documents\Hawk-Aero
tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=*.pem --exclude=.env --exclude=.env.local -czf $env:TEMP\hawk-corrected.tar.gz -C Hawk-AeroSpace-Corrected Hawk-AeroSpace-Corrected
tar --exclude=node_modules --exclude=dist --exclude=.git --exclude=*.pem --exclude=.env* -czf $env:TEMP\hawk-backend-prod.tar.gz -C Hawk-Aerosystem Backend
aws s3 cp $env:TEMP\hawk-corrected.tar.gz s3://<your-bucket>/hawk-corrected.tar.gz
aws s3 cp $env:TEMP\hawk-backend-prod.tar.gz s3://<your-bucket>/hawk-backend-prod.tar.gz
```
```bash
# Session Manager shell on instance2:
aws s3 cp s3://<your-bucket>/hawk-corrected.tar.gz ~/hawk-corrected.tar.gz
aws s3 cp s3://<your-bucket>/hawk-backend-prod.tar.gz ~/hawk-backend-prod.tar.gz
# upload server-setup-corrected.sh the same way (or paste it), then:
DOMAIN=hawkaerosystem.com SERVER_DIR=~/hawk-corrected BACKEND_DIR=~/hawk-backend-prod bash ~/hawk-corrected-setup.sh
```

## 6. HTTPS (once, after §1 DNS resolves — full command list in chat runbook)

```bash
sudo certbot --nginx -d hawkaerosystem.com -d www.hawkaerosystem.com --redirect --agree-tos --no-eff-email -m you@example.com
sudo nginx -t && sudo systemctl reload nginx
curl -s -o /dev/null -w "https:%{http_code}\n" https://hawkaerosystem.com/login
sudo certbot renew --dry-run   # verify auto-renewal works
```

## 7. Admin sees BOTH backends (simultaneously, accurately)

- Patched: `Admin_Frontend/src/api/client.ts` — dual bases (`REACT_APP_API_URL` test, `REACT_APP_PROD_API_URL` prod default `https://hawkaerosystem.com/api`), `setApiEnvironment('test'|'prod')` persisted, all `fetch` uses current base. New: `src/components/BackendSwitcher.tsx` — drop into Settings/header.
- Admin `.env`: add `REACT_APP_PROD_API_URL=https://hawkaerosystem.com/api` (test var unchanged), rebuild/redeploy admin. Usage: open admin → switcher → **Test DB** (instance1 `:3000`, Website data) vs **Prod (hawk-prod)** (instance2 `/api`, Corrected data) → **log out + log back in after switching** (JWTs are per-backend). Same user appears twice (once per DB) — expected, not a bug.
- Accuracy check (no UI needed):
```bash
curl -s http://43.205.190.95:3000/api/role-applications -H "Authorization: Bearer $TEST_JWT" | head -c 500; echo
curl -sk https://hawkaerosystem.com/api/role-applications -H "Authorization: Bearer $PROD_JWT" | head -c 500; echo
# test returns Website rows; prod returns [] (empty hawk-prod) until first Corrected signup
```

## 8. Verify

```bash
docker compose -f ~/hawk-corrected/docker-compose.yml ps
docker compose -f ~/hawk-corrected/docker-compose.yml logs --tail=30 frontend
pm2 list   # hawk-backend-prod online
curl -s -o /dev/null -w "frontend:%{http_code}\n" http://127.0.0.1:3000/login
curl -s -o /dev/null -w "prod api:%{http_code}\n" http://127.0.0.1:3001/api/docs
curl -sk -o /dev/null -w "public:%{http_code}\n" https://hawkaerosystem.com/
```
Browser: `https://hawkaerosystem.com/login` → fresh signup (hawk-prod empty = correct) → role switcher + 9-dot + logout on every page; `/pilot` inside single navbar + sage sidebar.

## Ops

- Redeploy = §5 again. Never `docker compose down -v`. `NEXT_PUBLIC_*` bake at build → key changes need rebuild.
- Firebase console → Authorized domains += `hawkaerosystem.com`, `www.hawkaerosystem.com`.
