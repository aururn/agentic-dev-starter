#!/usr/bin/env bash
# CI と同じ必須検査．技術スタックを導入したら，lint，型検査，テストをここに追加する．
# 例：
#   npm run lint
#   npm run typecheck
#   npm test
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

echo "==> skills の同期"
bash scripts/sync-skills.sh --check

echo "==> SKILL.md の frontmatter"
status=0
for f in .agents/skills/*/SKILL.md; do
  dir_name="$(basename "$(dirname "$f")")"
  name="$(sed -n 's/^name: *//p' "$f" | head -n1)"
  desc="$(sed -n 's/^description: *//p' "$f" | head -n1)"
  if [[ "$(head -n1 "$f")" != "---" || -z "$name" || -z "$desc" ]]; then
    echo "::error file=$f::frontmatter に name と description が必要です" >&2
    status=1
  elif [[ "$name" != "$dir_name" ]]; then
    echo "::error file=$f::name ($name) が directory 名 ($dir_name) と一致しません" >&2
    status=1
  fi
done
exit "$status"
