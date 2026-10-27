# Hawk-AeroSpace-Corrected deploy (run from YOUR PC).
# Uploads Corrected (frontend+compose) AND a Backend copy (prod Nest, hawk-prod)
# to instance2 (i-06ca0e0724641ecc2). No SSH key needed if you use Session
# Manager (see README §SSH) — this script needs a key ONLY for scp/ssh.
# Without a key, follow README §5B (Session Manager + S3) instead.
#
# Secrets are NEVER uploaded: ~/hawk-corrected/.env and ~/hawk-backend-prod/.env
# live ONLY on the server (README §4). This uploads code only.
[CmdletBinding()]
param(
    [string]$PublicIp = '',
    [string]$SshUser = 'ubuntu',
    [string]$SshKey = '',
    [string]$Domain = 'hawkaerosystem.com',
    [string]$RepoRoot = '',
    [string]$BackendRoot = ''
)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $base = if ($PSCommandPath) { Split-Path -Parent $PSCommandPath } else { (Get-Location).Path }
    $RepoRoot = Split-Path -Parent (Split-Path -Parent $base)
}
if ([string]::IsNullOrWhiteSpace($BackendRoot)) {
    # Exact copy source: Hawk-Aerosystem\Backend (same code, prod DB ID on server)
    $BackendRoot = Join-Path (Split-Path -Parent $RepoRoot) 'Hawk-Aerosystem\Backend'
}
$DEFAULT_KEY = 'C:\Users\fawwa\.ssh\instance2-admin-2026.pem'
if ([string]::IsNullOrWhiteSpace($PublicIp)) { $PublicIp = $env:DEPLOY_CORRECTED_IP }
if ([string]::IsNullOrWhiteSpace($PublicIp)) { throw 'Set -PublicIp (instance2 EIP) or $env:DEPLOY_CORRECTED_IP. EC2 console > i-06ca0e0724641ecc2 > Public IPv4. No key? Use README §5B (Session Manager).' }
if ([string]::IsNullOrWhiteSpace($SshKey)) { $SshKey = $env:DEPLOY_SSH_KEY }
if ([string]::IsNullOrWhiteSpace($SshKey) -and (Test-Path -LiteralPath $DEFAULT_KEY)) { $SshKey = $DEFAULT_KEY }
if ([string]::IsNullOrWhiteSpace($SshKey)) { throw 'Set -SshKey (path to .pem) or $env:DEPLOY_SSH_KEY. Default tried: C:\Users\fawwa\.ssh\instance2-admin-2026.pem. Or use §5B keyless path.' }
if (!(Test-Path -LiteralPath $SshKey)) { throw "SSH key not found: $SshKey" }
if (!(Test-Path -LiteralPath $BackendRoot)) { throw "Backend copy source missing: $BackendRoot" }

$tmp = Join-Path ([IO.Path]::GetTempPath()) 'hawk-corrected-deploy'
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tmp | Out-Null
Write-Host "Packing Corrected (no node_modules/.next/.git/.env*)..."
& tar --exclude='node_modules' --exclude='.next' --exclude='.git' --exclude='*.pem' --exclude='.env' --exclude='.env.local' -czf (Join-Path $tmp 'hawk-corrected.tar.gz') -C (Split-Path -Parent $RepoRoot) (Split-Path -Leaf $RepoRoot)
Write-Host "Packing Backend copy (no node_modules/dist/.git/.env*)..."
& tar --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='*.pem' --exclude='.env*' -czf (Join-Path $tmp 'hawk-backend-prod.tar.gz') -C (Split-Path -Parent $BackendRoot) (Split-Path -Leaf $BackendRoot)
Copy-Item -LiteralPath (Join-Path $RepoRoot 'frontend\deploy\server-setup-corrected.sh') -Destination (Join-Path $tmp 'hawk-corrected-setup.sh')

Write-Host "Uploading to ${SshUser}@${PublicIp}..."
& scp -i $SshKey -o StrictHostKeyChecking=accept-new (Join-Path $tmp 'hawk-corrected.tar.gz') "${SshUser}@${PublicIp}:~/hawk-corrected.tar.gz"
& scp -i $SshKey (Join-Path $tmp 'hawk-backend-prod.tar.gz') "${SshUser}@${PublicIp}:~/hawk-backend-prod.tar.gz"
& scp -i $SshKey (Join-Path $tmp 'hawk-corrected-setup.sh') "${SshUser}@${PublicIp}:~/hawk-corrected-setup.sh"
Write-Host "Running server setup..."
& ssh -i $SshKey "${SshUser}@${PublicIp}" "chmod +x ~/hawk-corrected-setup.sh && DOMAIN='$Domain' SERVER_DIR=~/hawk-corrected BACKEND_DIR=~/hawk-backend-prod bash ~/hawk-corrected-setup.sh"
Remove-Item -Recurse -Force $tmp
Write-Host "Done. Verify: https://$Domain/login and https://$Domain/api/docs"
