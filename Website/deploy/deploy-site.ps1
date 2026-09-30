# Hawk booking site deploy (run from your PC)
# Builds nothing locally: uploads source + production env to EC2, where the
# server installs, builds (NEXT_PUBLIC_* bake in there), and (re)starts PM2.
# Mirrors Hawk-Aerosystem/deploy/deploy-backend.ps1 conventions.
#
# NO SECRETS LIVE IN THIS FILE. Values resolve in this order per setting:
#   1. explicit script parameter, 2. your git-ignored project .env.local
#      (DEPLOY_PUBLIC_IP / DEPLOY_SSH_KEY / NEXT_PUBLIC_*), 3. throw with
#      instructions. Nothing secret is committed to git, ever.
#
# PREREQUISITES (one time):
#   1. AWS security group: open inbound TCP 8083 (or your $FrontPort).
#   2. Firebase console: Authentication > Settings > Authorized domains > add
#      your EC2 public IP.
#   3. Node 22+ on the server (script asserts this remotely).
#   4. A project .env.local holding DEPLOY_PUBLIC_IP, DEPLOY_SSH_KEY and the
#      NEXT_PUBLIC_* build values (see .env.example for the full list).
#
# Run with (values omitted = read from .env.local):
#   powershell -ExecutionPolicy Bypass -File deploy\deploy-site.ps1
# Optional overrides, e.g.:
#   ... -PublicIp "1.2.3.4" -RazorpayKeyId "rzp_test_..." -GoogleMapsKey "AIza..."
# Pass -UseServerEnv to reuse the server-owned ~/hawk-newsite/.env.production
# instead of uploading env at all (see README), -SkipBackendCorsUpdate to
# leave ~/hawk-backend/.env + the `main` process untouched.
#
# Verify in browser:  http://<EC2-IP>:8083/

[CmdletBinding()]
param(
    [string]$PublicIp = '',
    [string]$SshUser = 'ubuntu',
    [string]$SshKey = '',
    [string]$ProjectDir = '',
    [int]$FrontPort = 8083,
    [int]$NextPort = 3002,
    [string]$Pm2Name = 'hawk-newsite',

    # Baked into the build at `npm run build` time (NEXT_PUBLIC_*).
    [string]$ApiBaseUrl = '',
    [string]$RazorpayKeyId = '',
    [string]$GoogleMapsKey = '',
    [string]$FirebaseApiKey = '',
    [string]$FirebaseAuthDomain = '',
    [string]$FirebaseProjectId = '',
    [string]$FirebaseStorageBucket = '',
    [string]$FirebaseMessagingSenderId = '',
    [string]$FirebaseAppId = '',
    [string]$FirebaseMeasurementId = '',

    [switch]$SkipBackendCorsUpdate,
    [switch]$UseServerEnv
)

$ErrorActionPreference = 'Stop'

# $PSScriptRoot can be empty depending on how the script is launched
# (ISE, dot-sourcing, certain hosts) — resolve the project dir defensively.
if ([string]::IsNullOrWhiteSpace($ProjectDir)) {
    $base = if ($PSCommandPath) { Split-Path -Parent $PSCommandPath }
            elseif ($PSScriptRoot) { $PSScriptRoot }
            else { (Get-Location).Path }
    if ((Split-Path -Leaf $base) -eq 'deploy') { $base = Split-Path -Parent $base }
    $ProjectDir = $base
}

# Resolve per-setting: explicit param > project .env.local (git-ignored) > throw.
# .env.local keys: DEPLOY_PUBLIC_IP, DEPLOY_SSH_KEY, plus every NEXT_PUBLIC_*
# build value (see .env.example). The file itself is never uploaded.
$DotEnv = @{}
$DotEnvPath = Join-Path $ProjectDir '.env.local'
if (Test-Path -LiteralPath $DotEnvPath) {
    foreach ($line in (Get-Content -LiteralPath $DotEnvPath)) {
        $t = $line.Trim()
        if ($t -eq '' -or $t.StartsWith('#')) { continue }
        $eq = $t.IndexOf('=')
        if ($eq -gt 0) { $DotEnv[$t.Substring(0, $eq).Trim()] = $t.Substring($eq + 1).Trim() }
    }
}
function Resolve-DeployValue([string]$Current, [string]$EnvName, [string]$Hint) {
    if (-not [string]::IsNullOrWhiteSpace($Current)) { return $Current }
    if ($DotEnv.ContainsKey($EnvName) -and -not [string]::IsNullOrWhiteSpace($DotEnv[$EnvName])) {
        return $DotEnv[$EnvName]
    }
    throw "Missing value for $Hint. Pass it as a parameter or set $EnvName in $DotEnvPath (see .env.example)."
}

$PublicIp = Resolve-DeployValue $PublicIp 'DEPLOY_PUBLIC_IP' 'EC2 public IP (-PublicIp)'
$SshKey = Resolve-DeployValue $SshKey 'DEPLOY_SSH_KEY' 'SSH key path (-SshKey)'

if (-not $UseServerEnv) {
    # NOTE: ApiBaseUrl is deliberately NOT read from .env.local — that file
    # holds the LOCAL dev URL (localhost:3001) which must never bake into a
    # production build. Explicit param wins, else derive from the EC2 IP.
    if ([string]::IsNullOrWhiteSpace($ApiBaseUrl)) {
        $ApiBaseUrl = "http://${PublicIp}:3000/api"
    }
    $RazorpayKeyId = Resolve-DeployValue $RazorpayKeyId 'NEXT_PUBLIC_RAZORPAY_KEY_ID' 'Razorpay key (-RazorpayKeyId)'
    $GoogleMapsKey = Resolve-DeployValue $GoogleMapsKey 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY' 'Maps key (-GoogleMapsKey)'
    $FirebaseApiKey = Resolve-DeployValue $FirebaseApiKey 'NEXT_PUBLIC_FIREBASE_API_KEY' 'Firebase API key'
    $FirebaseAuthDomain = Resolve-DeployValue $FirebaseAuthDomain 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN' 'Firebase auth domain'
    $FirebaseProjectId = Resolve-DeployValue $FirebaseProjectId 'NEXT_PUBLIC_FIREBASE_PROJECT_ID' 'Firebase project ID'
    $FirebaseStorageBucket = Resolve-DeployValue $FirebaseStorageBucket 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET' 'Firebase bucket'
    $FirebaseMessagingSenderId = Resolve-DeployValue $FirebaseMessagingSenderId 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID' 'Firebase sender ID'
    $FirebaseAppId = Resolve-DeployValue $FirebaseAppId 'NEXT_PUBLIC_FIREBASE_APP_ID' 'Firebase app ID'
    $FirebaseMeasurementId = Resolve-DeployValue $FirebaseMeasurementId 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID' 'Firebase measurement ID'
}
if (-not (Test-Path $SshKey)) { throw "SSH key not found: $SshKey" }
if (-not (Test-Path (Join-Path $ProjectDir 'package.json'))) { throw "Not a project dir: $ProjectDir" }

$TmpTar = Join-Path $env:TEMP 'hawk-newsite.tar.gz'
$TmpEnv = Join-Path $env:TEMP 'hawk-newsite.env.production'
$DeployDir = Split-Path -Parent $TmpTar

Write-Host '1/5  Packing source (no node_modules/.next/.git/secrets)...'
Push-Location $ProjectDir
# NOTE: .env.local / .env*.local are excluded and NEVER ship; production env
# is generated below as .env.production.
tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=.turbo `
    --exclude='.env' --exclude='.env.*' `
    -czf $TmpTar .
if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Pack failed.' }
Pop-Location

Write-Host '2/5  Resolving production env...'
$uploadedEnv = $false
if ($UseServerEnv) {
    Write-Host '  USE_SERVER_ENV: skipping upload, server-owned ~/hawk-newsite/.env.production will be used.'
} else {
    Write-Host '  Writing production env (local temp file, deleted after upload)...'
    @(
        "# Generated by deploy-site.ps1 on $(Get-Date -Format o) - do not commit"
        "NEXT_PUBLIC_API_BASE_URL=$ApiBaseUrl"
        "NEXT_PUBLIC_API_FALLBACK_URL="
        "NEXT_PUBLIC_FIREBASE_API_KEY=$FirebaseApiKey"
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$FirebaseAuthDomain"
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID=$FirebaseProjectId"
        "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$FirebaseStorageBucket"
        "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$FirebaseMessagingSenderId"
        "NEXT_PUBLIC_FIREBASE_APP_ID=$FirebaseAppId"
        "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$FirebaseMeasurementId"
        "NEXT_PUBLIC_FIREBASE_TEST_MODE="
        "NEXT_PUBLIC_RAZORPAY_KEY_ID=$RazorpayKeyId"
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$GoogleMapsKey"
    ) | Set-Content -LiteralPath $TmpEnv -Encoding utf8
}

try {
    Write-Host '3/5  Uploading bundle + env + nginx conf + server script...'
    $dest = "${SshUser}@${PublicIp}"
    scp -i $SshKey $TmpTar "${dest}:~/hawk-newsite.tar.gz"
    if ($LASTEXITCODE -ne 0) { throw 'scp bundle failed.' }
    if (-not $UseServerEnv) {
        scp -i $SshKey $TmpEnv "${dest}:~/hawk-newsite.env.production"
        if ($LASTEXITCODE -ne 0) { throw 'scp env failed.' }
        $uploadedEnv = $true
    }
    scp -i $SshKey (Join-Path $ProjectDir 'deploy\nginx-hawk-newsite.conf') "${dest}:~/hawk-newsite-nginx.conf"
    if ($LASTEXITCODE -ne 0) { throw 'scp nginx conf failed.' }
    scp -i $SshKey (Join-Path $ProjectDir 'deploy\server-setup-newsite.sh') "${dest}:~/hawk-newsite-setup.sh"
    if ($LASTEXITCODE -ne 0) { throw 'scp setup script failed.' }

    Write-Host '4/5  Building + starting on server (takes a few minutes)...'
    $corsFlag = if ($SkipBackendCorsUpdate) { '0' } else { '1' }
    $remote = "NEXT_PORT=$NextPort PM2_NAME=$Pm2Name FRONT_PORT=$FrontPort PUBLIC_IP=$PublicIp BACKEND_CORS_UPDATE=$corsFlag bash ~/hawk-newsite-setup.sh"
    ssh -i $SshKey $dest $remote
    if ($LASTEXITCODE -ne 0) { throw 'Server step failed. Check output above / pm2 logs on server.' }

    Write-Host '5/5  Verifying public endpoint...'
    ssh -i $SshKey $dest "curl -s -m 15 -o /dev/null -w 'public:%{http_code}\n' http://127.0.0.1:${FrontPort}/"
    if ($LASTEXITCODE -ne 0) { throw 'Verification failed.' }
}
finally {
    Remove-Item -LiteralPath $TmpTar -ErrorAction SilentlyContinue
    if (-not $UseServerEnv) { Remove-Item -LiteralPath $TmpEnv -ErrorAction SilentlyContinue }
    $remoteCleanup = "rm -f ~/hawk-newsite.tar.gz ~/hawk-newsite-nginx.conf ~/hawk-newsite-setup.sh"
    if ($uploadedEnv) { $remoteCleanup += " ~/hawk-newsite.env.production" }
    ssh -i $SshKey "${SshUser}@${PublicIp}" $remoteCleanup 2>$null
}

Write-Host ""
Write-Host "Deployed. Open:  http://${PublicIp}:${FrontPort}/"
Write-Host "If login/OTP misbehaves there, first check Firebase Authorized domains + backend CORS (see deploy/README-newsite.md)."
