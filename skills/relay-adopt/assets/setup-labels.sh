#!/usr/bin/env bash
# Relay の label を作る．既にある label は色と説明を更新する．
# 種別と大きさの label を既存の label に対応づけている場合は，--status-only で状態 label だけを作る．
set -euo pipefail

status_labels=(
  "relay:ready|0E8A16|着手できる"
  "relay:working|FBCA04|実装中"
  "relay:blocked|B60205|依存または確認待ち"
  "relay:review|1D76DB|Draft PR があり，レビューか merge を待つ"
  "relay:release|5319E7|release PR"
)
other_labels=(
  "epic|3E4B9E|複数の Issue に分けて進める大項目"
  "type:feat|A2EEEF|機能の追加"
  "type:fix|D73A4A|不具合の修正"
  "type:refactor|C5DEF5|振る舞いを変えない改善"
  "type:docs|0075CA|文書"
  "type:chore|EDEDED|設定，依存，CI"
  "type:spike|F9D0C4|決めるための調査"
  "size:S|C2E0C6|1 つの関心事，差分がおおむね 200 行以下"
  "size:M|7BC96F|1 回のレビューで読める"
  "size:L|E99695|分けてから実装する"
)

labels=("${status_labels[@]}")
if [[ "${1:-}" != "--status-only" ]]; then
  labels+=("${other_labels[@]}")
fi

for entry in "${labels[@]}"; do
  IFS="|" read -r name color description <<<"$entry"
  gh label create "$name" --color "$color" --description "$description" --force
done
