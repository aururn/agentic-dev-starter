# ADR-002 repository ごとの違いを .agents/relay.yml に集める

状態：採用（2026-09-30）

## 背景

同じ手順を複数の repository で使いたいが，base branch（`main` か `staging` か），branch 名，PR title の規則，
検査の command，独立レビューの方法が repository ごとに違う．

## 判断

- repository ごとの値は `.agents/relay.yml` に置く．skill の本文には repository 固有の値を書かない．
- file がなくても既定値で動くようにし，`relay-adopt` で作るよう勧める．
- 値を推定できない項目（検査の command など）は，agent が推測で埋めずに利用者に確認する．

## 理由

- skill を全ての repository で同じ版に保てる．更新は `skills` CLI で取り込むだけで済む．
- 設定が 1 つの file にあるので，運用の違いを diff で確かめられる．

## 他の案

- repository ごとに skill を書き換える：skill の更新を取り込むたびに手作業の merge が必要になる．
- `AGENTS.md` の文章に書く：agent が値を読み違えやすく，skill から機械的に参照しにくい．

## 結果

`relay.yml` と `AGENTS.md` の記述が食い違う可能性がある．その場合は `AGENTS.md` を優先し，agent が食い違いを報告する．
