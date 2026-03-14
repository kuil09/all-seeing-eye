#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
port="${REVIEW_CONSOLE_PORT:-4173}"

html_file="$(mktemp)"
timeline_file="$(mktemp)"
detail_file="$(mktemp)"
log_file="$(mktemp)"
server_pid=""

cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" >/dev/null 2>&1 || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -f "$html_file" "$timeline_file" "$detail_file" "$log_file"
}

trap cleanup EXIT

PORT="$port" HOST="127.0.0.1" node "$repo_root/scripts/serve-review-console.mjs" >"$log_file" 2>&1 &
server_pid="$!"

for _ in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:$port/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

curl -fsS "http://127.0.0.1:$port/apps/review-console/" >"$html_file"
curl -fsS "http://127.0.0.1:$port/api/timeline" >"$timeline_file"
curl -fsS "http://127.0.0.1:$port/api/events/evt_20260314_harbor_north_inspections" >"$detail_file"

grep -q "Analyst Review Console" "$html_file"
grep -q "./app.js" "$html_file"

python3 - "$timeline_file" "$detail_file" <<'PY'
import json
import sys

timeline = json.load(open(sys.argv[1], "r", encoding="utf-8"))
detail = json.load(open(sys.argv[2], "r", encoding="utf-8"))

assert len(timeline["items"]) >= 2
assert timeline["items"][0]["eventId"] == "evt_20260314_substation_outage"
assert detail["event"]["id"] == "evt_20260314_harbor_north_inspections"
assert len(detail["sources"]) == 2
PY

echo "Review console smoke test passed."
