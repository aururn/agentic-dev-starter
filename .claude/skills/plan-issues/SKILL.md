---
name: plan-issues
description: 利用者の依頼を 1 PR で完了する大きさの GitHub Issue に分解し，epic，sub-issue，依存関係，label を作成する．「Issue に分けて」「タスクを分解して」「計画を立てて」「〇〇を作りたい」と依頼されたときに使う．
---

# plan-issues

依頼を epic と sub-issue に分解し，利用者の承認を得てから GitHub に作成する．

## 必読文書

- `docs/architecture/issue-pr-authoring.md`（Issue の section，サイズ，Definition of Ready）
- `docs/architecture/coding-agent-workflow.md`（sub-issue と blocked by の API，状態 label）
- `docs/testing-strategy.md`（テスト層の記号）

## Workflow

1. **前提を確認する**．`gh repo view --json nameWithOwner`，`gh issue list --state open --limit 50` で既存の Issue を確認し，
   重複する Issue があれば新しく作らずに報告する．関連する code と docs を読む．
2. **分解する**．次の規則で sub-issue に分ける．
   - 1 sub-issue は 1 つの PR で完了し，1 回のレビューで読める大きさ（`size:S` または `size:M`）にする．
   - 独立に検証できる規則ごとに分ける．層（DB，API，UI）ごとに分けるのは，各層が単独で検証できる場合だけにする．
   - 依存は最小にし，依存の順に並べる．並行して進められるものは依存させない．
   - 調べないと決められないことは，先に spike の Issue にする．
   - sub-issue が 1 件で済む場合は epic を作らない．
3. **分解案を提示して承認を得る**．GitHub に書き込む前に，次の表を利用者に示す．承認されるまで作成しない．

   | 順序 | タイトル | 種別 | サイズ | 依存 | 要求振る舞い（要約） |
   | ---- | -------- | ---- | ------ | ---- | -------------------- |

4. **label を確認する**．`gh label list` で `type:*`，`size:*`，`status:*`，`epic` がなければ `bash scripts/setup-labels.sh` を実行する．
5. **Issue を作成する**．本文は同梱の雛形を埋めて作る．空欄を残さず，未確定の項目は `未確定` と調査内容を書く．
   - epic：[templates/epic.md](templates/epic.md)，label `epic`
   - 作業：[templates/work.md](templates/work.md)，label `type:<種別>`，`size:<S|M>`，`status:ready`
   - 不具合：[templates/bug.md](templates/bug.md)，label `type:bug`，`size:<S|M>`，`status:ready`

   ```bash
   gh issue create --title "<title>" --body-file <埋めた本文> --label "type:feature,size:M,status:ready"
   ```

   タイトルは「〜する」で終わる日本語の動詞句にする（例：`招待の再送 API を追加する`）．
6. **親子関係と依存を登録する**．内部 id を取得して API を呼ぶ．

   ```bash
   repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
   child_id=$(gh api "repos/$repo/issues/<子の番号>" --jq .id)
   gh api -X POST "repos/$repo/issues/<epic の番号>/sub_issues" -F sub_issue_id="$child_id"
   blocker_id=$(gh api "repos/$repo/issues/<依存先の番号>" --jq .id)
   gh api -X POST "repos/$repo/issues/<依存元の番号>/dependencies/blocked_by" -F issue_id="$blocker_id"
   ```

   依存がある Issue は `status:ready` の代わりに `status:blocked` を付ける．
   API が失敗した場合は，本文の「参照」に `親：#N`，`依存：#N` を書き，その旨を報告する．
7. **複数 session にまたがる epic** の場合は `docs/exec-plans/template.md` から plan を作る（commit は最初の PR に含める）．
8. **報告する**．作成した Issue の番号とタイトル，依存の順序，最初に着手できる Issue を表で示す．

## Validation

- `gh issue view <番号> --json title,labels,body` で本文の section と label を確認する．
- `gh api "repos/$repo/issues/<epic の番号>/sub_issues" --jq '.[].number'` で親子関係を確認する．

## 禁止事項

- 利用者の承認前に Issue を作成しない．
- `size:L` の Issue を作業 Issue として作らない．
- 本文に担当者，依存，親子関係などの GitHub metadata を重複して書かない（API が使えない場合の代替を除く）．
