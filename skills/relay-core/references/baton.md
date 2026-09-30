# バトン comment

Issue ごとに **1 つだけ** 置き，書き足さずに **上書きして** 使う comment．今の状態と次の一手を示す．
新しい session や別の agent は，最初にこの comment を読めば作業を再開できる．

経過を comment で何件も書き足すと，最新の状態がどれか分からなくなる．そのため，状態はバトンに 1 つだけ置き，
経過の記録は commit と PR に任せる．

## 書式

1 行目の marker で見つける．marker は変えない．

```markdown
<!-- relay:baton -->
**Relay** 状態：`実装中`　担当：@octocat（Claude Code）　更新：2026-09-30 14:20 +09:00

| | |
| --- | --- |
| branch | `feat/12-resend-invitation` |
| PR | #34（Draft） |
| 済んだこと | 再送の API と test．`npm test` は成功 |
| 次の一手 | 古い招待を無効にする処理を transaction にまとめる |
| 止まっている理由 | なし |
| 手元だけにあるもの | なし |
```

## 状態

| 状態       | 意味                                                     | 状態 label      |
| ---------- | -------------------------------------------------------- | --------------- |
| `準備済み` | 着手の条件を満たし，誰も担当していない                   | `relay:ready`   |
| `実装中`   | 担当者が作業している                                     | `relay:working` |
| `中断`     | 担当者が作業を止めた．次の一手を見れば誰でも再開できる   | `relay:ready`   |
| `待機`     | 依存，利用者の判断，外部の返事を待っている               | `relay:blocked` |
| `レビュー待ち` | Draft PR があり，レビューまたは merge を待つ         | `relay:review`  |
| `完了`     | PR が merge され，Issue が close された                  | なし（外す）    |

## 規則

- 「手元だけにあるもの」には，push していない変更，local の DB の状態，起動中の process などを書く．
  中断するときは，可能な限り WIP commit を push して，ここを「なし」にする．
- 「次の一手」は，それだけ読めば着手できる具体的な 1 つの作業にする．「続きをやる」とは書かない．
- 時刻は offset 付きで書く．
- 担当が替わるときは，Assignee と一緒に更新する．

## 操作

```bash
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)

# 探す（なければ空）
id=$(gh api "repos/$repo/issues/<番号>/comments" --paginate \
  --jq '.[] | select(.body | startswith("<!-- relay:baton -->")) | .id' | head -n1)

# 作る
gh issue comment <番号> --body-file baton.md

# 上書きする
gh api -X PATCH "repos/$repo/issues/comments/$id" -F body=@baton.md
```
