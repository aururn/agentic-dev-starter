#!/usr/bin/env bash
# .agents/skills（正本）を .claude/skills へコピーする．
# --check を付けると，コピーせずに差分の有無だけを検査する．
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/.agents/skills"
dst="$root/.claude/skills"

if [[ "${1:-}" == "--check" ]]; then
  if diff -r "$src" "$dst" >/dev/null 2>&1; then
    echo "skills are in sync"
    exit 0
  fi
  echo "::error::.claude/skills が .agents/skills と一致しません．bash scripts/sync-skills.sh を実行してください．" >&2
  diff -r "$src" "$dst" >&2 || true
  exit 1
fi

rm -rf "$dst"
mkdir -p "$(dirname "$dst")"
cp -R "$src" "$dst"
echo "synced: .agents/skills -> .claude/skills"
