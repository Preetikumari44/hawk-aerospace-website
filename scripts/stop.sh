#!/usr/bin/env bash
# Safe shutdown: stops and removes containers; named volumes (database, uploads) are KEPT.
cd "$(dirname "$0")/.."
docker compose --profile mail-dev down
