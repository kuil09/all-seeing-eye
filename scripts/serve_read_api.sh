#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PORT="${PORT:-4310}" HOST="${HOST:-127.0.0.1}" node "$repo_root/services/read-api/server.mjs"
