#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
checkpoint_date="${CHECKPOINT_DATE:-2026-03-18}"
playwright_bin="$repo_root/node_modules/.bin/playwright"

run_step() {
  local label="$1"
  shift

  printf "\n==> %s\n" "$label"
  "$@"
}

if [[ ! -x "$playwright_bin" ]]; then
  echo "Playwright is not installed in this workspace. Run 'npm ci' before the checkpoint." >&2
  exit 1
fi

printf "Running first integration checkpoint for %s\n" "$checkpoint_date"
printf "Repository root: %s\n" "$repo_root"
printf "Shared baseline: %s\n" "$(git -C "$repo_root" rev-parse --short HEAD)"

run_step "Validate SQL schema" ./scripts/validate_sql.sh
run_step "Validate JSON contracts" ./scripts/validate_json.sh
run_step "Smoke pipeline against seeded SQLite data" npm run pipeline:smoke
run_step "Smoke read API" npm run read-api:smoke
run_step "Syntax-check review console entrypoint" node --check apps/review-console/app.js
run_step "Run review console handoff tests" npm run review-console:handoff:test
run_step "Smoke review console in fixture mode" npm run review-console:smoke
run_step "Smoke review console in SQLite mode" npm run review-console:smoke:sqlite
run_step "Run handoff E2E flow" npm run review-console:e2e -- e2e/view-handoff.spec.js --reporter=list

printf "\nFirst integration checkpoint passed for %s at baseline %s\n" \
  "$checkpoint_date" \
  "$(git -C "$repo_root" rev-parse --short HEAD)"
