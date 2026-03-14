#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_dir="$(mktemp -d)"
db_file="$tmp_dir/all-seeing-eye.sqlite"
html_file="$tmp_dir/review-console.html"
health_file="$tmp_dir/healthz.json"
timeline_file="$tmp_dir/timeline.json"
detail_file="$tmp_dir/detail.json"
log_file="$tmp_dir/review-console.log"
server_pid=""
port="${REVIEW_CONSOLE_PORT:-4173}"

cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" >/dev/null 2>&1 || true
    wait "$server_pid" 2>/dev/null || true
  fi

  rm -rf "$tmp_dir"
}

trap cleanup EXIT

node "$repo_root/services/pipeline/cli.mjs" seed-demo --db "$db_file" --run-id "review_console_sqlite_smoke" >/dev/null

READ_API_DB_PATH="$db_file" PORT="$port" HOST="127.0.0.1" \
  node "$repo_root/scripts/serve-review-console.mjs" >"$log_file" 2>&1 &
server_pid="$!"

for _ in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:$port/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

curl -fsS "http://127.0.0.1:$port/healthz" >"$health_file"
curl -fsS "http://127.0.0.1:$port/apps/review-console/" >"$html_file"
curl -fsS "http://127.0.0.1:$port/api/timeline" >"$timeline_file"
curl -fsS "http://127.0.0.1:$port/api/events/evt_20260314_harbor_north_inspections" >"$detail_file"

grep -q "Analyst Review Console" "$html_file"
grep -q "./app.js" "$html_file"

python3 - "$health_file" "$timeline_file" "$detail_file" <<'PY'
import json
import sys

health = json.load(open(sys.argv[1], "r", encoding="utf-8"))
timeline = json.load(open(sys.argv[2], "r", encoding="utf-8"))
detail = json.load(open(sys.argv[3], "r", encoding="utf-8"))

assert health == {"status": "ok", "backend": "sqlite"}
assert len(timeline["items"]) == 2
assert timeline["items"][0]["eventId"] == "evt_20260314_substation_outage"
assert timeline["items"][0]["sourceCount"] == 2
assert detail["event"]["id"] == "evt_20260314_harbor_north_inspections"
assert detail["event"]["reviewStatus"] == "pending_review"
assert len(detail["sources"]) == 2
assert len(detail["relationships"]) == 2
PY

echo "SQLite-backed review console smoke test passed."
