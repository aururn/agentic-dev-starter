---
name: review-pr
description: Pull Request の差分を対応する Issue の契約とレビューの観点で検査し，P0/P1 の指摘を修正して PR 本文を更新する．「PR をレビューして」「#34 を確認して」と依頼されたとき，または implement-issue の最後に使う．
---

# review-pr

引数は PR 番号とする．番号がない場合は現在の branch の PR を対象にする．

## 必読文書

- `docs/architecture/review-checklist.md`（重要度，観点，指摘の書き方）
- `docs/architecture/issue-pr-authoring.md`（PR 本文の review の観点）

## Workflow

1. **対象を集める**．

   ```bash
   gh pr view <PR 番号> --json number,title,body,headRefOid,baseRefName,isDraft,closingIssuesReferences
   gh pr diff <PR 番号>
   gh issue view <closing Issue の番号> --json title,body
   ```

2. **独立した context でレビューする**．実装した context の思い込みを持ち込まないため，次のどれかで行う．
   - Claude Code：`reviewer` subagent に PR 番号を渡す．
   - Codex：実装とは別の session でこの skill を実行する．または `/review` を併用する．
   - どちらも使えない場合：自己レビューである旨を報告に明記する．
3. **指摘を整理する**．`review-checklist.md` の形式で，重要度の順に並べる．根拠が差分または Issue にない指摘は除く．
4. **修正する**．利用者がレビューのみを依頼した場合は修正せず，指摘を報告して終える．それ以外は次を行う．
   - P0/P1 は全て修正する．P2 は修正するか，修正しない理由を PR の「レビューの入口」に書く．
   - 修正後は `bash scripts/check.sh` を実行し，commit して push する．
   - 新しい head の差分で手順 2 からやり直す．P0/P1 がなくなるまで繰り返す．
5. **PR 本文を更新する**．確認結果を新しい head の実績で更新し，「Issue との差異」と「レビューの入口」を最新にする．
   CI の結果は `gh pr checks <PR 番号> --watch` で待ってから書く．
6. **報告する**．次を表で示す．
   - 指摘と対応（修正した commit，または修正しない理由）
   - 現在の head の SHA と CI の結果
   - 利用者が判断すべき点（Draft 解除と merge を含む）

## Validation

- `bash scripts/check.sh`
- `gh pr checks <PR 番号>` が現在の head で全て成功している．

## 禁止事項

- 利用者の承認なしに PR を approve，Draft 解除，merge しない．
- レビューのために Issue の範囲外の変更を加えない．
- 指摘を PR comment として投稿するのは，利用者が依頼した場合だけにする．
