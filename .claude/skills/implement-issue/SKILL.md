---
name: implement-issue
description: GitHub Issue を 1 件実装し，linked branch の作成，commit，push，Draft PR の作成，CI の確認までを行う．「#12 を実装して」「この Issue を進めて」「次の Issue をやって」と依頼されたときに使う．
---

# implement-issue

引数は Issue 番号とする．番号がない場合は `status:ready` の open Issue から依存の少ない順に候補を示し，利用者に選んでもらう．

## 必読文書

- `AGENTS.md`（作業手順，GitHub への提出，禁止事項）
- `docs/architecture/issue-pr-authoring.md`（Definition of Ready，PR の構成，確認結果の規則）
- `docs/architecture/coding-agent-workflow.md`（branch 名，状態 label）
- `docs/testing-strategy.md`
- Issue の「参照」にある docs，ADR，exec plan

## Workflow

1. **Issue を読む**．

   ```bash
   repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
   gh issue view <番号> --json number,title,body,labels,assignees,state
   gh issue develop --list <番号>
   gh pr list --search "<番号> in:body" --state open
   gh api "repos/$repo/issues/<番号>/dependencies/blocked_by" --jq '.[] | select(.state=="open") | .number'
   ```

2. **着手できるか判定する**．次のどれかに当たれば実装を始めず，理由を報告して停止する．
   - Definition of Ready を満たさない（要求振る舞いまたは受け入れ条件がない，`size:L`，epic である）．
   - open の依存 Issue がある．
   - 自分以外の Assignee，既存の linked branch，open PR がある（利用者が継続を依頼した場合を除く）．
3. **着手を記録する**．

   ```bash
   gh issue edit <番号> --add-assignee @me --add-label status:in-progress --remove-label status:ready
   git switch main && git pull --ff-only
   gh issue develop <番号> --name <番号>-<slug> --base main --checkout
   ```

4. **設計を決める**．変更前に，不変条件，テスト計画の各行をどの test で実現するか，非スコープを整理する．
   Issue の予定と異なる判断をした場合は，理由とともに記録し，PR の「Issue との差異」に書く．
5. **実装する**．要求振る舞いの `Then` を検査するテストを先に書き，失敗を確認してから実装する．
   範囲外の問題を見つけたら直さずにメモし，最後に新しい Issue の候補として報告する．
6. **検証する**．狭いテストから始め，最後に `bash scripts/check.sh` を実行する．失敗したら修正して繰り返す．
7. **自己レビューをする**．`git diff main...HEAD` を `docs/architecture/review-checklist.md` の観点で確認し，P0/P1 を修正する．
8. **commit して push する**．Conventional Commits に従い，1 commit 1 関心事にする．

   ```bash
   git push -u origin HEAD
   ```

9. **Draft PR を作る**．`.github/pull_request_template.md` を埋めた本文を file に書き，Draft で作る．
   - `Closes #<番号>` を 1 件だけ書く．
   - 確認結果には手順 6 で実際に実行した結果だけを書く．CI の行は，まだ結果がないので ⏭ にしておく．

   ```bash
   gh pr create --draft --base main --title "<type>(<scope>): <内容>" --body-file <本文>
   ```

10. **CI を確認する**．現在の head の CI 結果を待ち，失敗したら修正して push する．

    ```bash
    gh pr checks <PR 番号> --watch
    gh pr view <PR 番号> --json headRefOid,isDraft,closingIssuesReferences,mergeable
    ```

    結果が出たら，PR 本文の確認結果の CI の行を head の短い SHA と結果で更新する（`gh pr edit <PR 番号> --body-file <本文>`）．
11. **レビューに渡す**．`review-pr` skill を実行する．Claude Code では `/review-pr <PR 番号>`，Codex では別 session で `$review-pr <PR 番号>` を使う．
12. **報告する**．PR の URL，確認結果，残った P2 以下の指摘，新しい Issue の候補を報告する．Draft 解除と merge は利用者に任せる．

## Validation

- `bash scripts/check.sh`
- `gh pr checks <PR 番号>` が現在の head で全て成功している．
- `gh pr view <PR 番号> --json closingIssuesReferences` が対象 Issue の 1 件だけを返す．

## 禁止事項

- Draft 解除，レビュー依頼，merge，force push を承認なしに行わない．
- Issue の範囲外の変更を同じ PR に含めない．
- 実行していない確認を ✅ にしない．古い head の CI 結果を新しい head の結果として書かない．
