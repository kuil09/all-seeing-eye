#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

html_file="$(mktemp)"
timeline_file="$(mktemp)"
detail_file="$(mktemp)"
updated_timeline_file="$(mktemp)"
updated_detail_file="$(mktemp)"
post_response_file="$(mktemp)"
review_action_file="$(mktemp)"
log_file="$(mktemp)"
server_pid=""

cleanup() {
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" >/dev/null 2>&1 || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -f "$html_file" "$timeline_file" "$detail_file" "$updated_timeline_file" "$updated_detail_file" "$post_response_file" "$review_action_file" "$log_file"
}

trap cleanup EXIT

REVIEW_ACTIONS_FILE="$review_action_file" PORT="$port" HOST="127.0.0.1" \
  node "$repo_root/scripts/serve-review-console.mjs" >"$log_file" 2>&1 &
server_pid="$!"

wait_for_server "http://127.0.0.1:$port/healthz"

curl -fsS "http://127.0.0.1:$port/apps/review-console/" >"$html_file"
curl -fsS "http://127.0.0.1:$port/api/timeline" >"$timeline_file"
curl -fsS "http://127.0.0.1:$port/api/events/evt_20260314_harbor_north_inspections" >"$detail_file"
curl -fsS -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"approve","notes":"Review console smoke approval."}' \
  "http://127.0.0.1:$port/api/events/evt_20260314_harbor_north_inspections/review-actions" >"$post_response_file"
curl -fsS "http://127.0.0.1:$port/api/timeline" >"$updated_timeline_file"
curl -fsS "http://127.0.0.1:$port/api/events/evt_20260314_harbor_north_inspections" >"$updated_detail_file"

grep -q "Analyst Review Console" "$html_file"
grep -q "./app.js" "$html_file"

python3 - "$timeline_file" "$detail_file" "$post_response_file" "$updated_timeline_file" "$updated_detail_file" <<'PY'
import json
import sys

timeline = json.load(open(sys.argv[1], "r", encoding="utf-8"))
detail = json.load(open(sys.argv[2], "r", encoding="utf-8"))
post_response = json.load(open(sys.argv[3], "r", encoding="utf-8"))
updated_timeline = json.load(open(sys.argv[4], "r", encoding="utf-8"))
updated_detail = json.load(open(sys.argv[5], "r", encoding="utf-8"))

assert len(timeline["items"]) >= 2
assert timeline["items"][0]["eventId"] == "evt_20260314_substation_outage"
assert detail["event"]["id"] == "evt_20260314_harbor_north_inspections"
assert len(detail["sources"]) == 2
assert post_response["reviewStatus"] == "approved"
assert updated_detail["event"]["reviewStatus"] == "approved"
assert updated_detail["reviewActions"][0]["action"] == "approve"
assert next(
    item for item in updated_timeline["items"]
    if item["eventId"] == "evt_20260314_harbor_north_inspections"
)["reviewStatus"] == "approved"
PY

echo "Review console smoke test passed."
