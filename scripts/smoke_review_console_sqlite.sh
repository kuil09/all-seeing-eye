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
reseeded_timeline_file="$tmp_dir/reseeded-timeline.json"
reseeded_detail_file="$tmp_dir/reseeded-detail.json"
post_response_file="$tmp_dir/post-response.json"
invalid_file="$tmp_dir/invalid-response.json"
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

READ_API_DB_PATH="$db_file" PORT="$port" HOST="127.0.0.1" \
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

node "$repo_root/services/pipeline/cli.mjs" seed-demo --db "$db_file" --run-id "review_console_sqlite_smoke_reseed" >/dev/null
curl -fsS "http://127.0.0.1:$port/api/timeline" >"$reseeded_timeline_file"
curl -fsS "http://127.0.0.1:$port/api/events/evt_20260314_harbor_north_inspections" >"$reseeded_detail_file"

invalid_status="$(curl -sS -o "$invalid_file" -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"reject","notes":"   "}' \
  "http://127.0.0.1:$port/api/events/evt_20260314_harbor_north_inspections/review-actions")"
if [[ "$invalid_status" != "400" ]]; then
  echo "Expected 400 for reject without notes but got $invalid_status" >&2
  exit 1
fi

grep -q "Analyst Review Console" "$html_file"
grep -q "./app.js" "$html_file"

python3 - "$db_file" "$health_file" "$timeline_file" "$detail_file" "$post_response_file" "$updated_timeline_file" "$updated_detail_file" "$reseeded_timeline_file" "$reseeded_detail_file" "$invalid_file" <<'PY'
import json
import sqlite3
import sys

database = sqlite3.connect(sys.argv[1])
health = json.load(open(sys.argv[2], "r", encoding="utf-8"))
timeline = json.load(open(sys.argv[3], "r", encoding="utf-8"))
detail = json.load(open(sys.argv[4], "r", encoding="utf-8"))
post_response = json.load(open(sys.argv[5], "r", encoding="utf-8"))
updated_timeline = json.load(open(sys.argv[6], "r", encoding="utf-8"))
updated_detail = json.load(open(sys.argv[7], "r", encoding="utf-8"))
reseeded_timeline = json.load(open(sys.argv[8], "r", encoding="utf-8"))
reseeded_detail = json.load(open(sys.argv[9], "r", encoding="utf-8"))
invalid = json.load(open(sys.argv[10], "r", encoding="utf-8"))

assert health == {"status": "ok", "backend": "sqlite"}
assert len(timeline["items"]) == 2
assert timeline["items"][0]["eventId"] == "evt_20260314_substation_outage"
assert timeline["items"][0]["sourceCount"] == 2
assert next(
    item for item in timeline["items"]
    if item["eventId"] == "evt_20260314_substation_outage"
)["tags"] == ["infrastructure", "weather", "outage"]
assert next(
    item for item in timeline["items"]
    if item["eventId"] == "evt_20260314_harbor_north_inspections"
)["tags"] == ["logistics", "inspection"]
assert detail["event"]["id"] == "evt_20260314_harbor_north_inspections"
assert detail["event"]["reviewStatus"] == "pending_review"
assert len(detail["sources"]) == 2
assert len(detail["relationships"]) == 2
assert post_response["reviewStatus"] == "edited"
assert updated_detail["event"]["reviewStatus"] == "edited"
assert updated_detail["reviewActions"][0]["action"] == "edit"
assert updated_detail["reviewActions"][0]["notes"] == "SQLite review console smoke edit."
assert next(
    item for item in updated_timeline["items"]
    if item["eventId"] == "evt_20260314_harbor_north_inspections"
)["reviewStatus"] == "edited"
assert next(
    item for item in reseeded_timeline["items"]
    if item["eventId"] == "evt_20260314_harbor_north_inspections"
)["reviewStatus"] == "edited"
assert reseeded_detail["event"]["reviewStatus"] == "edited"
assert reseeded_detail["reviewActions"][0]["notes"] == "SQLite review console smoke edit."
assert invalid["error"] == "Analyst notes are required when marking an event as rejected."

row = database.execute(
    """
    SELECT action, actor_name, notes
    FROM review_actions
    WHERE event_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    """,
    ("evt_20260314_harbor_north_inspections",),
).fetchone()

assert row == ("edit", "Local analyst", "SQLite review console smoke edit.")
PY

echo "SQLite-backed review console smoke test passed."
