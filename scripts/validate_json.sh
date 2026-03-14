#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

while IFS= read -r file; do
  python3 -m json.tool "$file" >/dev/null
  echo "Validated JSON: ${file#$repo_root/}"
done < <(find "$repo_root/contracts" "$repo_root/fixtures" -type f -name '*.json' | sort)
