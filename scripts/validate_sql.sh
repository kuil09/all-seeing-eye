#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

sqlite3 ":memory:" < "$repo_root/schemas/all-seeing-eye-v1.sql"
echo "SQL schema validated."
