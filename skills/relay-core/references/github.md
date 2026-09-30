# GitHub の操作

`gh` を使う．本文は必ず `--body-file` で渡し，shell の quote で崩れないようにする．

```bash
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
```

## 親子関係（sub-issue）と依存（blocked by）

API には Issue の `number` ではなく内部の `id` を渡す．

```bash
id_of() { gh api "repos/$repo/issues/$1" --jq .id; }

# 親 <epic> に子 <child> を付ける
gh api -X POST "repos/$repo/issues/<epic>/sub_issues" -F sub_issue_id="$(id_of <child>)"
gh api "repos/$repo/issues/<epic>/sub_issues" --jq '.[] | [.number, .state, .title] | @tsv'

# <issue> は <blocker> に依存する
gh api -X POST "repos/$repo/issues/<issue>/dependencies/blocked_by" -F issue_id="$(id_of <blocker>)"
gh api "repos/$repo/issues/<issue>/dependencies/blocked_by" --jq '.[] | [.number, .state] | @tsv'

# <blocker> が止めている Issue
gh api "repos/$repo/issues/<blocker>/dependencies/blocking" --jq '.[] | [.number, .state] | @tsv'
```

API が失敗した場合（古い GitHub Enterprise Server など）は，本文の「手がかり」に `親：#N`，`依存：#N` と書いて代わりにし，
そのことを報告する．

## label

```bash
gh label list --limit 200 --json name --jq '.[].name'
gh issue edit <番号> --add-label relay:working --remove-label relay:ready
```

## Assignee

```bash
gh issue edit <番号> --add-assignee @me
gh issue view <番号> --json assignees --jq '.assignees[].login'
```

## branch と PR

```bash
# Issue に紐づいた branch を作る（Issue の画面の Development 欄に出る）
gh issue develop <番号> --name <branch> --base <base> --checkout
gh issue develop --list <番号>

# Issue を閉じる予定の open PR
gh pr list --state open --search "<番号> in:body" --json number,headRefName,isDraft

gh pr create --draft --base <base> --title "<title>" --body-file pr.md
gh pr edit <PR> --body-file pr.md
gh pr view <PR> --json headRefOid,isDraft,mergeable,mergeStateStatus,closingIssuesReferences
gh pr checks <PR> --watch
```

## GitHub Projects

`relay.yml` の `projects` がある場合だけ使う．`gh auth refresh -s project` が必要な場合がある．

```bash
gh project item-add <number> --owner <owner> --url <Issue の URL>
```

## worktree

`relay.yml` の `worktree` がある場合，並列に作業する Issue ごとに作業場所を分ける．

```bash
git fetch origin <base>
git worktree add <worktree の path> -b <branch> origin/<base>
git worktree list
git worktree remove <worktree の path>   # merge 後
```

Windows では path の大文字と小文字（`Documents` と `documents`）を一致させる．一致しないと，同じ場所が別の場所として扱われる．
