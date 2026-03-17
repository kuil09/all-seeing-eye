#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$repo_root"

if ! git rev-parse --verify origin/main >/dev/null 2>&1; then
  echo "origin/main is missing. Run 'git fetch origin' first." >&2
  exit 2
fi

branch="$(git branch --show-current 2>/dev/null || true)"
if [[ -z "$branch" ]]; then
  branch="(detached HEAD)"
fi

head_sha="$(git rev-parse HEAD)"
main_sha="$(git rev-parse origin/main)"
merge_base="$(git merge-base HEAD origin/main)"
read -r main_only head_only < <(git rev-list --left-right --count origin/main...HEAD)

status_lines="$(git status --porcelain=v1)"
dirty_count="$(printf '%s\n' "$status_lines" | sed '/^$/d' | wc -l | tr -d ' ')"
tracked_count="$(printf '%s\n' "$status_lines" | awk 'substr($0, 1, 2) != "??" && NF {count++} END {print count + 0}')"
untracked_count="$(printf '%s\n' "$status_lines" | awk 'substr($0, 1, 2) == "??" {count++} END {print count + 0}')"

state=""
ready="no"
guidance=""

if [[ "$dirty_count" -gt 0 ]]; then
  state="local-only-dirty"
  guidance="Do not publish from this workspace. Move the intended changes onto a fresh branch from origin/main and validate there."
elif [[ "$main_only" -gt 0 ]]; then
  state="drifted-from-main"
  guidance="This branch is behind origin/main. Refresh from origin/main before promoting any work."
elif [[ "$head_sha" == "$main_sha" ]]; then
  state="shared-baseline"
  ready="yes"
  guidance="This workspace matches origin/main and can be cited as the current shared baseline."
elif [[ "$merge_base" == "$main_sha" ]]; then
  state="promotion-candidate"
  ready="yes"
  guidance="This clean branch is ahead of origin/main without falling behind it. Validate it, then promote it through an explicit issue/comment trail."
else
  state="diverged-from-main"
  guidance="This branch diverged before the current origin/main baseline. Rebase or replay only the validated changes onto a fresh branch from origin/main."
fi

printf 'Publication state: %s\n' "$state"
printf 'Ready to publish: %s\n' "$ready"
printf 'Repository root: %s\n' "$repo_root"
printf 'Branch: %s\n' "$branch"
printf 'HEAD: %s\n' "$head_sha"
printf 'origin/main: %s\n' "$main_sha"
printf 'Merge base: %s\n' "$merge_base"
printf 'Commits ahead of origin/main: %s\n' "$head_only"
printf 'Commits behind origin/main: %s\n' "$main_only"
printf 'Tracked changes: %s\n' "$tracked_count"
printf 'Untracked files: %s\n' "$untracked_count"
printf 'Guidance: %s\n' "$guidance"

if [[ "$ready" != "yes" ]]; then
  exit 1
fi
