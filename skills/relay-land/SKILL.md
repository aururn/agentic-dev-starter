---
name: relay-land
description: 利用者が merge を明示して依頼した PR を，merge の前の確認をしてから merge し，Issue の close，依存していた Issue の解除，バトン，branch と worktree の後片付けまで行う．「#34 を merge して」「これを入れて」と依頼されたときに使う．
---

# relay-land

merge は承認が必要な操作である．利用者がこの PR の merge を明示して依頼した場合だけ使う．
merge の依頼には，その PR の Draft 解除の依頼も含まれるものとして扱う．

## 先に読む

- [../relay-core/SKILL.md](../relay-core/SKILL.md) と `.agents/relay.yml`（`base`，`merge`，`release`，`review`）

## PR の種類を決める

`relay.yml` の `release` があり，PR の head が `release.from`，base が `release.to` の場合は「release PR」の節に従う．
それ以外は「通常の PR」の節に従う．

## 通常の PR

### merge の前に確かめること

どれか 1 つでも満たさない場合は，merge せずに理由を報告する．直せるもの（本文の更新，CI の再実行）は直してから確かめ直す．

| 確認                                                | 方法                                                          |
| --------------------------------------------------- | ------------------------------------------------------------- |
| 今の head の CI が全て成功している                  | `gh pr checks <PR>`                                           |
| 今の head でレビューが済み，P0/P1 がない             | 最後の relay-review の報告の head と，今の head を比べる      |
| base の最新を取り込んでも衝突しない                 | `gh pr view <PR> --json mergeable,mergeStateStatus`           |
| 本文の「確認した head:」が今の head と一致する      | `gh pr view <PR> --json headRefOid,body`                      |
| 閉じる Issue が 1 件で，その Issue が open で epic でない | 下の「閉じる Issue の取り方」                           |
| stack の場合，下の PR が先に merge されている       | PR の base が `relay.yml` の `base` であること                |

- レビューは原則として独立レビューとする．`review.independent` が `none` の場合と，`auto` で別の agent を使えなかった場合は，
  今の head の自己レビューで足りる．その場合は，PR の「見てほしいところ」に自己レビューのみである理由が書かれていることを確かめる．
- レビューの後に push があった場合は，`relay-review` をやり直す．
- 確かめた時点の `headRefOid` を **確認済み SHA** として控える．

### 閉じる Issue の取り方

GitHub は，PR の base が default branch の場合だけ `Closes #N` を closing link として扱う．
base が default branch でも，closing link が作られないことがある．

- `gh pr view <PR> --json closingIssuesReferences` が 1 件の場合：その Issue を使う．
- 空の場合（base が default branch でない場合，例：`staging`，または closing link が作られなかった場合）：
  PR 本文の `Closes #N` などの closing keyword から番号を取り，`gh issue view` で存在と状態を確かめる．
  Issue は GitHub が自動で閉じないため，merge の後に手順 5 で閉じる．

  ```bash
  gh pr view <PR> --json body --jq '[.body | scan("(^|[^[:alnum:]_])(close[sd]?|fix(e[sd])?|resolve[sd]?):?[[:space:]]+#([0-9]+)"; "i") | .[3]] | unique | .[]'
  gh issue view <番号> --json number,state,labels,title
  ```

### 手順

1. **merge の前に確かめる**．上の表を確かめ，確認済み SHA を控える．
2. **stack の上の PR を控える**．この PR の branch を base にしている open PR を探す．

   ```bash
   gh api --paginate "repos/$repo/pulls?state=open&base=<この PR の branch>&per_page=100" --jq '.[] | [.number, .head.ref, .head.sha] | @tsv'
   ```

   あれば，この PR の確認済み SHA を「下の PR の最後の commit」として控える．手順 6 で使う．
3. **merge する**．Draft であれば解除し，`merge.method` で merge する．`--match-head-commit` に確認済み SHA を渡し，
   確かめていない commit が merge されないようにする．head が変わって失敗した場合は，手順 1 からやり直す．
   branch はここでは消さない（`--delete-branch` を付けない）．worktree の中から実行すると local の branch を消せずに失敗し，
   stack の上の PR の付け替えも済んでいないため．

   ```bash
   gh pr ready <PR>
   gh pr merge <PR> --<method> --match-head-commit <確認済み SHA>
   ```

4. **merge が完了したか確かめる**．merge queue や auto-merge の repository では，`gh pr merge` が成功しても queue に入っただけの
   場合がある．`state` が `MERGED` になるまで次に進まない．

   ```bash
   gh pr view <PR> --json state,mergedAt,mergeCommit
   ```

   queue に入っただけの場合は，バトンの「止まっている理由」に「merge queue の完了待ち」と書いて報告し，ここで止める．
   後で `relay-land <PR>` をもう一度実行したときは，merge 済みであれば手順 5 から再開する．
5. **Issue が閉じたか確かめる**．自動で閉じないことがあるため，必ず読み直す．閉じていなければ，PR を示す comment を付けて閉じる．

   ```bash
   gh issue view <番号> --json state
   gh issue close <番号> --comment "#<PR> で対応した．"
   ```

6. **stack の上の PR を付け替える**．手順 2 で見つけた PR ごとに，base を `relay.yml` の `base` に変える．

   ```bash
   gh pr edit <上の PR> --base <base>
   ```

   `merge.method` が `merge` の場合はこれで終わる．`squash` または `rebase` の場合は，下の PR の commit が新しい base の祖先に
   ならないため，上の PR の差分に下の PR の変更が残る．上の PR に固有の commit だけを新しい base に載せ直す．
   履歴の書き換えなので，push の前に利用者の承認をもらう．

   ```bash
   upper_head=$(gh pr view <上の PR> --json headRefOid --jq .headRefOid)
   git fetch origin <base> <上の PR の branch>
   # local に上の PR の branch があり，upper_head と違う場合（push していない commit がある場合など）は止まって報告する
   git switch -C <上の PR の branch> "$upper_head"
   git rebase --onto origin/<base> <下の PR の最後の commit>
   git push --force-with-lease=<上の PR の branch>:"$upper_head" origin <上の PR の branch>   # 承認後
   ```

   `upper_head` を，載せ直しの起点と `--force-with-lease` の両方に使う．remote にだけある commit を失わないため．
7. **バトンを `完了` にし，状態 label を外す**．
8. **止めていた Issue を解除する**．この Issue が止めていた Issue のうち，状態 label が `relay:blocked` のものだけを対象にする．
   open の依存が残っていなければ，`relay:ready` にし，バトンがあれば `準備済み` にする．
   `relay:working` と `relay:review` の Issue（stack で先に進めている Issue）は，状態もバトンも変えない．

   ```bash
   gh api --paginate "repos/$repo/issues/<番号>/dependencies/blocking" --jq '.[] | select(.state=="open") | .number'
   ```

9. **epic を確かめる**．親の epic の sub-issue が全て閉じていれば，epic の「完了の姿」を確かめ，close するかを利用者に聞く．
10. **手元と branch を片付ける**．Issue 用の worktree の中からは base を checkout できない（元の作業場所で checkout されている）．
    次の順で，元の作業場所から行う．

    ```bash
    git worktree list                             # 1 行目が元の作業場所
    cd <元の作業場所>
    git worktree remove <Issue 用の worktree>     # worktree を使った場合だけ
    git switch <base> && git pull --ff-only
    git rev-parse <merge した branch>             # 確認済み SHA と一致するか確かめる
    git branch -D <merge した branch>             # 一致した場合だけ
    git ls-remote origin refs/heads/<merge した branch>   # remote の branch の先端を読む
    git push --force-with-lease=<merge した branch>:<確認済み SHA> origin :<merge した branch>   # 一致した場合だけ
    ```

    local の branch が確認済み SHA と違う場合は，push していない commit があるので branch を消さずに止まり，報告する．
    squash merge では branch が merge 済みと判定されないため，`git branch -d` ではなく，SHA の一致で判断する．

    remote の branch は，`git ls-remote` の結果で次のように扱う．merge の後に他の人が push した commit を消さないため．

    | remote の branch の先端 | 扱い |
    | --- | --- |
    | 空（repository の設定で自動削除された場合など） | 消さない．既に消えている |
    | 確認済み SHA と一致する | lease を付けて消す |
    | 確認済み SHA と違う | 消さずに止まり，先端の SHA と，確認済み SHA の後の commit を報告する |

    lease（`--force-with-lease=<branch>:<確認済み SHA>`）により，読んだ後に push があった場合も削除は `stale info` で失敗する．
    失敗した場合は，もう一度消そうとせず，止まって報告する．
11. **報告する**．merge した commit，閉じた Issue，着手できるようになった Issue，次の一手を示す．

## release PR

`release.from` の branch（例：`staging`）は merge の後も使い続ける．通常の PR の手順のうち，Issue，バトン，stack，
branch の削除に関わるものは行わない．

### merge の前に確かめること

| 確認                                           | 方法                                                            |
| ---------------------------------------------- | --------------------------------------------------------------- |
| 今の head の CI が全て成功している             | `gh pr checks <PR>`                                             |
| base の最新を取り込んでも衝突しない            | `gh pr view <PR> --json mergeable,mergeStateStatus`             |
| `relay:release` label が付いている             | `gh pr view <PR> --json labels`                                 |
| 本文の「含まれる PR」が今の差分と一致する      | 下の手順 1                                                      |

「閉じる Issue」と「確認した head:」は確かめない．release PR は Issue を閉じず，`relay-pr-policy` も検査しないため．
確かめた時点の `headRefOid` を確認済み SHA として控える．

### 手順

1. **本文を今の差分に合わせる**．`release.to` にまだない commit から，含まれる PR を集める．本文の「含まれる PR」と「移行手順」を
   その結果で更新する．

   ```bash
   git fetch origin <from> <to>
   git log --first-parent --format='%h %s' origin/<to>..origin/<from>
   gh api --paginate "repos/$repo/pulls?state=closed&base=<from>&per_page=100" --jq '.[] | select(.merged_at) | [.number, .title, .merged_at] | @tsv'
   ```

2. **merge する**．`merge.method` に関わらず merge commit（`--merge`）を使う．squash や rebase では `from` の commit が
   `to` の祖先にならず，次の release で同じ変更が再び差分に出て，衝突の原因になるため．`--delete-branch` は付けない．

   ```bash
   gh pr ready <PR>
   gh pr merge <PR> --merge --match-head-commit <確認済み SHA>
   ```

3. **merge が完了したか確かめる**．通常の PR の手順 4 と同じ．
4. **報告する**．merge した commit，含まれた PR，移行手順を示す．

## してはいけないこと

- 利用者の明示の依頼なしに merge すること．「進めて」は merge の依頼に含めない．
- 確認に失敗した状態で，required check を迂回して merge すること（`--admin` を使わない）．
- `release.from` の branch を削除すること．
- 先端が確認済み SHA と違う branch を，local でも remote でも削除すること．
