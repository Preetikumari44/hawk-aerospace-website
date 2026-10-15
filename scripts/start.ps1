# Windows PowerShell + Docker Desktop. Starts everything in dependency order.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host "Created .env from .env.example. Edit the CHANGE_ME values, then run this script again."
  exit 1
}
if (Select-String -Path .env -Pattern "^[A-Za-z_][A-Za-z0-9_]*=.*CHANGE_ME" -Quiet) { Write-Host "Replace every CHANGE_ME value in .env first."; exit 1 }
docker compose --profile mail-dev up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Website:  http://localhost:3000"
Write-Host "Mail UI:  http://localhost:8025"
docker compose ps
