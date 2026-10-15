# Safe shutdown: containers are removed, the named volumes (database, uploads) are KEPT.
Set-Location (Join-Path $PSScriptRoot "..")
docker compose --profile mail-dev down
