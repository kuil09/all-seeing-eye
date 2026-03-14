#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_dir="$(mktemp -d)"
db_file="$tmp_dir/all-seeing-eye.sqlite"
log_one="$tmp_dir/seed-one.json"
log_two="$tmp_dir/seed-two.json"
timeline_file="$tmp_dir/timeline.json"
detail_file="$tmp_dir/detail.json"
missing_file="$tmp_dir/missing.json"
server_log="$tmp_dir/read-api.log"
server_pid=""
port="${READ_API_PORT:-4310}"

cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" >/dev/null 2>&1 || true
    wait "$server_pid" 2>/dev/null || true
  fi

  rm -rf "$tmp_dir"
}

trap cleanup EXIT

node "$repo_root/services/pipeline/cli.mjs" seed-demo --db "$db_file" --run-id "smoke_one" >"$log_one"
node "$repo_root/services/pipeline/cli.mjs" seed-demo --db "$db_file" --run-id "smoke_two" >"$log_two"

python3 - "$log_one" "$log_two" <<'PY'
import json
import sys

first = json.load(open(sys.argv[1], "r", encoding="utf-8"))
second = json.load(open(sys.argv[2], "r", encoding="utf-8"))

assert first["counts"]["sourceRecords"] == 4
assert first["counts"]["events"] == 2
assert first["counts"]["claims"] == 4
assert second["counts"] == first["counts"]
assert all(check["ok"] for check in second["qualityChecks"])
PY

READ_API_DB_PATH="$db_file" PORT="$port" HOST="127.0.0.1" \
  node "$repo_root/services/read-api/server.mjs" >"$server_log" 2>&1 &
server_pid="$!"

for _ in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:$port/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

curl -fsS "http://127.0.0.1:$port/api/timeline" >"$timeline_file"
curl -fsS "http://127.0.0.1:$port/api/events/evt_20260314_harbor_north_inspections" >"$detail_file"
missing_status="$(curl -sS -o "$missing_file" -w "%{http_code}" "http://127.0.0.1:$port/api/events/evt_missing")"

if [[ "$missing_status" != "404" ]]; then
  echo "Expected 404 for missing event but got $missing_status" >&2
  exit 1
fi

python3 - "$timeline_file" "$detail_file" "$missing_file" <<'PY'
import json
import sys

timeline = json.load(open(sys.argv[1], "r", encoding="utf-8"))
detail = json.load(open(sys.argv[2], "r", encoding="utf-8"))
missing = json.load(open(sys.argv[3], "r", encoding="utf-8"))

assert timeline["nextCursor"] is None
assert len(timeline["items"]) == 2
assert timeline["items"][0]["eventId"] == "evt_20260314_substation_outage"
assert timeline["items"][0]["sourceCount"] == 2
assert detail["event"]["id"] == "evt_20260314_harbor_north_inspections"
assert detail["event"]["reviewStatus"] == "pending_review"
assert len(detail["sources"]) == 2
assert len(detail["relationships"]) == 2
assert missing["error"] == "Event not found"
PY

echo "Pipeline smoke test passed."
