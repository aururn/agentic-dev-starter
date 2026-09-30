#!/usr/bin/env bash
# Issue の種別，サイズ，状態を表す label を作成する．既にある label は色と説明を更新する．
set -euo pipefail

labels=(
  "epic|3E4B9E|複数の sub-issue に分けて進める大項目"
  "type:feature|1D76DB|機能の追加"
  "type:bug|D73A4A|不具合の修正"
  "type:refactor|5319E7|振る舞いを変えない改善"
  "type:docs|0075CA|文書"
  "type:chore|BFD4F2|設定，依存，CI など"
  "type:spike|FBCA04|判断のための調査"
  "size:S|C2E0C6|1 つの関心事，差分がおおむね 200 行以下"
  "size:M|7BC96F|複数ファイルにまたがるが 1 回のレビューで読める"
  "size:L|E99695|分割が必要．このまま実装しない"
  "status:ready|0E8A16|Definition of Ready を満たす"
  "status:in-progress|FEF2C0|実装中"
  "status:blocked|B60205|依存または確認待ち"
)

for entry in "${labels[@]}"; do
  IFS="|" read -r name color description <<<"$entry"
  gh label create "$name" --color "$color" --description "$description" --force
done
