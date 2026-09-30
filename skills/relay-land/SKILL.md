---
name: relay-land
description: 利用者が merge を明示して依頼した PR を，merge の前の確認をしてから merge し，Issue の close，依存していた Issue の解除，バトン，branch と worktree の後片付けまで行う．「#34 を merge して」「これを入れて」と依頼されたときに使う．
---

# relay-land

merge は承認が必要な操作である．利用者がこの PR の merge を明示して依頼した場合だけ使う．

## 先に読む

- [../relay-core/SKILL.md](../relay-core/SKILL.md) と `.agents/relay.yml`（`merge`，`release`）

## merge の前に確かめること

どれか 1 つでも満たさない場合は，merge せずに理由を報告する．直せるもの（本文の更新，CI の再実行）は直してから確かめ直す．

| 確認                                             | 方法                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| 今の head の CI が全て成功している               | `gh pr checks <PR>`                                               |
| 今の head でレビューが済み，P0/P1 がない          | 最後の relay-review の報告の head と，今の head を比べる．下の注を参照 |
| base の最新を取り込んでも衝突しない              | `gh pr view <PR> --json mergeable,mergeStateStatus`               |
| 本文の「確認した head:」が今の head と一致する   | `gh pr view <PR> --json headRefOid,body`                          |
| 閉じる Issue が 1 件で，その Issue が epic でない | 下の「閉じる Issue の取り方」                                     |
| stack の場合，下の PR が先に merge されている    | PR の base が `relay.yml` の `base` であること                    |

レビューの後に push があった場合は，`relay-review` をやり直す．

レビューは原則として独立レビューとする．ただし，`review.independent` が `none` の場合と，`auto` で別の agent を使えなかった場合は，
今の head の自己レビューで足りる．その場合は，PR の「見てほしいところ」に自己レビューのみである理由が書かれていることを確かめる．

確かめた時点の `headRefOid` を控えておく．手順 4 でこの SHA を指定し，確かめていない commit が merge されないようにする．

### 閉じる Issue の取り方

GitHub は，PR の base が default branch の場合だけ `Closes #N` を closing link として扱う．

- base が default branch の場合：`gh pr view <PR> --json closingIssuesReferences` の 1 件を使う．
- base が default branch でない場合（例：`staging`）：`closingIssuesReferences` は空になる．PR 本文の `Closes #N` などの行から
  番号を取り，その Issue が存在して open であることを `gh issue view` で確かめる．この場合，Issue は merge 後に手順 6 で閉じる．

## 手順

1. 上の表を確かめる．
2. Draft であれば解除する．merge の依頼には Draft 解除の依頼も含まれるものとして扱う．

   ```bash
   gh pr ready <PR>
   ```

3. **stack の上の PR を確かめる**．この PR の branch を base にしている PR があれば，merge の後に手順 7 で付け替えるので，
   手順 4 では `--delete-branch` を付けない．

   ```bash
   gh pr list --state open --base <この PR の branch> --json number,headRefName
   ```

4. `merge.method` で merge する．`--match-head-commit` に手順 1 で控えた SHA を渡す．head が変わっていて失敗した場合は，手順 1 からやり直す．

   ```bash
   gh pr merge <PR> --<method> --delete-branch --match-head-commit <控えた SHA>
   ```

5. **merge が完了したか確かめる**．merge queue や auto-merge の repository では，`gh pr merge` が成功しても queue に入っただけの
   場合がある．`state` が `MERGED` になるまで，手順 6 以降に進まない．

   ```bash
   gh pr view <PR> --json state,mergedAt,mergeCommit
   ```

   queue に入っただけの場合は，バトンの「止まっている理由」に「merge queue の完了待ち」と書いて報告し，ここで止める．
   後で `relay-land <PR>` をもう一度実行したときは，merge 済みであれば手順 6 から再開する．
6. **Issue が閉じたか確かめる**．自動で閉じないことがあるため，必ず読み直す．閉じていなければ，PR を示す comment を付けて閉じる．

   ```bash
   gh issue view <番号> --json state
   gh issue close <番号> --comment "#<PR> で対応した．"
   ```

7. **stack の上の PR を付け替える**．手順 3 で見つけた PR ごとに行う．
   - `merge.method` が `merge` の場合：base を `relay.yml` の `base` に変えるだけでよい．
   - `squash` または `rebase` の場合：下の PR の commit が新しい base の祖先にならないため，base を変えるだけでは上の PR の差分に
     下の PR の変更が残る．上の PR に固有の commit だけを新しい base に載せ直す．これは履歴の書き換えなので，push の前に利用者の承認をもらう．

   ```bash
   gh pr edit <上の PR> --base <base>
   git fetch origin
   git rebase --onto origin/<base> <下の PR の最後の commit> <上の PR の branch>
   git push --force-with-lease=<上の PR の branch>:<rebase 前の上の PR の head> origin <上の PR の branch>   # 承認後
   ```

   付け替えが済んだら，merge した branch を消す（`git push origin --delete <branch>`）．
8. **バトンを `完了` にし，状態 label を外す**．
9. **止めていた Issue を解除する**．この Issue が止めていた Issue ごとに，open の依存が残っていなければ，
   状態 label を `relay:blocked` から `relay:ready` にする．バトンがあれば `準備済み` にする．

   ```bash
   gh api "repos/$repo/issues/<番号>/dependencies/blocking" --jq '.[] | select(.state=="open") | .number'
   ```

10. **epic を確かめる**．親の epic の sub-issue が全て閉じていれば，epic の「完了の姿」を確かめ，close するかを利用者に聞く．
11. **手元を片付ける**．Issue 用の worktree で作業していた場合，その worktree の中からは base を checkout できない
    （base は元の作業場所で checkout されている）．次の順で行う．

    ```bash
    git worktree list                      # 1 行目が元の作業場所
    cd <元の作業場所>
    git worktree remove <Issue 用の worktree の path>
    git switch <base> && git pull --ff-only
    ```

    worktree を使っていない場合は，`git switch <base> && git pull --ff-only` だけを行う．
12. **報告する**．merge した commit，閉じた Issue，着手できるようになった Issue，次の一手を示す．

## release PR

`relay.yml` の `release` がある場合，`from` から `to` への PR は release PR として扱う．release PR には，上の手順のうち
1，2，4，5，12 だけを使う．`from` の branch は merge の後も使い続けるので，次のことを必ず守る．

- `gh pr merge` に `--delete-branch` を付けない．`from` の branch を削除しない．
- stack の付け替え（手順 3，7），Issue の close（手順 6），バトンと依存の更新（手順 8，9）を行わない．
- 含まれる PR を `gh pr list --state merged --base <from>` と差分から集め，一覧と移行手順を本文に書く．
- `relay:release` label を付ける．Issue は閉じない．
- merge は通常の PR と同じく，利用者の明示の依頼がある場合だけ行う．

```bash
gh pr merge <PR> --<method> --match-head-commit <控えた SHA>
```

## してはいけないこと

- 利用者の明示の依頼なしに merge すること．「進めて」は merge の依頼に含めない．
- 確認に失敗した状態で，required check を迂回して merge すること（`--admin` を使わない）．
