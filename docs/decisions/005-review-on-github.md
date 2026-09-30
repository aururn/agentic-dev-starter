# ADR-005 独立レビューを GitHub の @codex review で受ける

状態：採用（2026-09-30）

## 背景

最初の版の `relay-review` は，手元の端末で `codex review` などを実行していた．レビューの指摘と対応は agent の報告にしか
残らず，利用者は PR を見ても，何を指摘され，どう直したかが分からなかった．
また，手順の中で一時 branch `relay-review-<PR>` を消しており，branch の削除に承認を求める `relay-core` の規則と食い違っていた．

## 判断

- 独立レビューの既定（`review.independent: auto`）を，PR に `@codex review` と comment して，
  Codex の GitHub 連携（`chatgpt-codex-connector[bot]`）のレビューを受ける方法にする．
- 連携がない，利用上限に達した，10 分待っても応答がない場合は，手元の方法（`codex review`，`claude -p`，subagent）に切り替える．
- どの方法でも，レビューの結果と，指摘ごとの対応（直した commit，または直さない理由）を PR に comment する．
- P2 以下の指摘は，明らかな誤りでない限り対応しない．個別の返信も要らない．
- `relay-review-<PR>` の削除は，PR の head に含まれない commit がない場合に限り，承認なしに行ってよい操作に加える．

## 理由

- レビューと対応が PR に残り，人も次の agent も GitHub だけで経過を追える（ADR-001 と同じ考え）．
- `@codex review` は GitHub 上で PR の head をレビューするので，手元の checkout の取り違えが起きない．
- 利用上限や連携のない repository があるので，代わりの方法が要る．代わりの方法でも結果を PR に書けば，見え方は同じになる．
- 一時 branch は PR の head の copy で，独自の commit がなければ消しても何も失われない．

## 他の案

- 手元の `codex review` のまま，結果だけを PR に貼る：既定が手元になり，GitHub 連携のある repository でも使わない．
- 一時 branch を作らず，detached の worktree を使う：規則の例外は要らないが，既に作られた branch の扱いは残る．
- P2 も全て直すか理由を書く：往復が増え，レビューが終わらない．

## 結果

- PR の comment が増える．
- Codex で実装した PR も，既定では Codex がレビューする．別の session なので会話の思い込みは持ち込まないが，
  model は同じになる．別の model を使いたい場合は `review.independent` に command か `subagent` を設定する．
- 応答を待つ時間（最大 10 分）だけ，レビューが遅くなる．
