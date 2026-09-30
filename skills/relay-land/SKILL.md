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
| 今の head で独立レビューが済み，P0/P1 がない      | 最後の relay-review の報告の head と，今の head を比べる          |
| base の最新を取り込んでも衝突しない              | `gh pr view <PR> --json mergeable,mergeStateStatus`               |
| 本文の「確認した head:」が今の head と一致する   | `gh pr view <PR> --json headRefOid,body`                          |
| 閉じる Issue が 1 件で，その Issue が epic でない | `gh pr view <PR> --json closingIssuesReferences`                  |
| stack の場合，下の PR が先に merge されている    | PR の base が `relay.yml` の `base` であること                    |

独立レビューの後に push があった場合は，`relay-review` をやり直す．

## 手順

1. 上の表を確かめる．
2. Draft であれば解除する．merge の依頼には Draft 解除の依頼も含まれるものとして扱う．

   ```bash
   gh pr ready <PR>
   ```

3. `merge.method` で merge する．

   ```bash
   gh pr merge <PR> --<method> --delete-branch
   ```

4. **Issue が閉じたか確かめる**．自動で閉じないことがあるため，必ず読み直す．閉じていなければ，PR を示す comment を付けて閉じる．

   ```bash
   gh issue view <番号> --json state
   gh issue close <番号> --comment "#<PR> で対応した．"
   ```

5. **バトンを `完了` にし，状態 label を外す**．
6. **止めていた Issue を解除する**．この Issue が止めていた Issue ごとに，open の依存が残っていなければ，
   状態 label を `relay:blocked` から `relay:ready` にし，バトンを `準備済み` にする．

   ```bash
   gh api "repos/$repo/issues/<番号>/dependencies/blocking" --jq '.[] | select(.state=="open") | .number'
   ```

7. **stack の上の PR を付け替える**．この PR の branch を base にしていた PR があれば，base を `relay.yml` の `base` に変える．

   ```bash
   gh pr list --base <merge した branch> --json number
   gh pr edit <上の PR> --base <base>
   ```

8. **epic を確かめる**．親の epic の sub-issue が全て閉じていれば，epic の「完了の姿」を確かめ，close するかを利用者に聞く．
9. **手元を片付ける**．worktree を使っていれば消す．base に戻して最新にする．

   ```bash
   git switch <base> && git pull --ff-only
   git worktree remove <worktree の path>
   ```

10. **報告する**．merge した commit，閉じた Issue，着手できるようになった Issue，次の一手を示す．

## release PR

`relay.yml` の `release` がある場合，`from` から `to` への PR は release PR として扱う．

- 含まれる PR を `gh pr list --state merged --base <from>` と差分から集め，一覧と移行手順を本文に書く．
- `relay:release` label を付ける．Issue は閉じない．
- merge は通常の PR と同じく，利用者の明示の依頼がある場合だけ行う．

## してはいけないこと

- 利用者の明示の依頼なしに merge すること．「進めて」は merge の依頼に含めない．
- 確認に失敗した状態で，required check を迂回して merge すること（`--admin` を使わない）．
