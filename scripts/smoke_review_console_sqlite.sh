#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmp_dir="$(mktemp -d)"
db_file="$tmp_dir/all-seeing-eye.sqlite"
html_file="$tmp_dir/review-console.html"
health_file="$tmp_dir/healthz.json"
timeline_file="$tmp_dir/timeline.json"
detail_file="$tmp_dir/detail.json"
updated_timeline_file="$tmp_dir/updated-timeline.json"
updated_detail_file="$tmp_dir/updated-detail.json"
post_response_file="$tmp_dir/post-response.json"
review_action_file="$tmp_dir/review-actions.json"
log_file="$tmp_dir/review-console.log"
server_pid=""

pick_port() {
  python3 - <<'PY'
import socket

with socket.socket() as sock:
    sock.bind(("127.0.0.1", 0))
    print(sock.getsockname()[1])
PY
}

wait_for_server() {
  local url="$1"

  for _ in $(seq 1 40); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi

    if [[ -n "$server_pid" ]] && ! kill -0 "$server_pid" 2>/dev/null; then
      echo "Review console exited before becoming ready." >&2
      cat "$log_file" >&2
      exit 1
    fi

    sleep 0.25
  done

  echo "Review console did not become ready at $url." >&2
  cat "$log_file" >&2
  exit 1
}

port="${REVIEW_CONSOLE_PORT:-$(pick_port)}"

cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" >/dev/null 2>&1 || true
    wait "$server_pid" 2>/dev/null || true
  fi

  rm -rf "$tmp_dir"
}

trap cleanup EXIT

node "$repo_root/services/pipeline/cli.mjs" seed-demo --db "$db_file" --run-id "review_console_sqlite_smoke" >/dev/null

READ_API_DB_PATH="$db_file" REVIEW_ACTIONS_FILE="$review_action_file" PORT="$port" HOST="127.0.0.1" \
  node "$repo_root/scripts/serve-review-console.mjs" >"$log_file" 2>&1 &
server_pid="$!"

wait_for_server "http://127.0.0.1:$port/healthz"

curl -fsS "http://127.0.0.1:$port/healthz" >"$health_file"
curl -fsS "http://127.0.0.1:$port/apps/review-console/" >"$html_file"
curl -fsS "http://127.0.0.1:$port/api/timeline" >"$timeline_file"
curl -fsS "http://127.0.0.1:$port/api/events/evt_20260314_harbor_north_inspections" >"$detail_file"
curl -fsS -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"edit","notes":"SQLite review console smoke edit."}' \
  "http://127.0.0.1:$port/api/events/evt_20260314_harbor_north_inspections/review-actions" >"$post_response_file"
curl -fsS "http://127.0.0.1:$port/api/timeline" >"$updated_timeline_file"
curl -fsS "http://127.0.0.1:$port/api/events/evt_20260314_harbor_north_inspections" >"$updated_detail_file"

grep -q "Analyst Review Console" "$html_file"
grep -q "./app.js" "$html_file"

python3 - "$health_file" "$timeline_file" "$detail_file" "$post_response_file" "$updated_timeline_file" "$updated_detail_file" <<'PY'
import json
import sys

health = json.load(open(sys.argv[1], "r", encoding="utf-8"))
timeline = json.load(open(sys.argv[2], "r", encoding="utf-8"))
detail = json.load(open(sys.argv[3], "r", encoding="utf-8"))
post_response = json.load(open(sys.argv[4], "r", encoding="utf-8"))
updated_timeline = json.load(open(sys.argv[5], "r", encoding="utf-8"))
updated_detail = json.load(open(sys.argv[6], "r", encoding="utf-8"))

assert health == {"status": "ok", "backend": "sqlite"}
assert len(timeline["items"]) == 2
assert timeline["items"][0]["eventId"] == "evt_20260314_substation_outage"
assert timeline["items"][0]["sourceCount"] == 2
assert detail["event"]["id"] == "evt_20260314_harbor_north_inspections"
assert detail["event"]["reviewStatus"] == "pending_review"
assert len(detail["sources"]) == 2
assert len(detail["relationships"]) == 2
assert post_response["reviewStatus"] == "edited"
assert updated_detail["event"]["reviewStatus"] == "edited"
assert updated_detail["reviewActions"][0]["action"] == "edit"
assert next(
    item for item in updated_timeline["items"]
    if item["eventId"] == "evt_20260314_harbor_north_inspections"
)["reviewStatus"] == "edited"
PY

echo "SQLite-backed review console smoke test passed."
