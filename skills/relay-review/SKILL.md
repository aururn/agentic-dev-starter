---
name: relay-review
description: PR の差分を，対応する Issue の約束と照らして，実装した agent とは別の目で検査する．既定では PR に `@codex review` と comment して GitHub 上でレビューを受け，使えない場合は手元の方法に切り替えて結果を PR に comment する．P0 と P1 の指摘を直し，対応を PR に返信し，PR 本文を今の head の結果に更新する．「PR をレビューして」「#34 を確認して」と依頼されたとき，または relay-build の最後に使う．
---

# relay-review

引数は PR の番号とする．ない場合は，今の branch の PR を対象にする．

レビューの指摘と対応は，全て PR 上に残す．利用者が PR を見るだけで，何を指摘され，どう対応したかが分かるようにする．

## 先に読む

- [../relay-core/SKILL.md](../relay-core/SKILL.md) と `.agents/relay.yml`（`review.independent`）
- [../relay-core/references/profile.md](../relay-core/references/profile.md) の「独立レビュー」
- [../relay-core/references/formats.md](../relay-core/references/formats.md) の PR の規則

## 指摘の重要度

| 重要度 | 意味                                                        | 扱い                         |
| ------ | ----------------------------------------------------------- | ---------------------------- |
| P0     | data の破壊，security の穴，secret の漏洩，base branch が壊れる | 必ず直す                     |
| P1     | Issue の完了条件（種類ごとの節）または「振る舞いの例」を満たさない，回帰，test の欠落 | 必ず直す                     |
| P2     | 保守しにくさ，重複，軽い境界の漏れ                          | 明らかな誤りでない限り対応しなくてよい |
| P3     | 好みの範囲の提案                                            | 対応しなくてよい             |

レビューをした側が付けた重要度は，そのまま使わない．この表の意味に照らして付け直す．
例えば，動作を壊さない書き方の提案に P1 が付いていても，P2 以下として扱う．

## 観点

1. **約束**：Issue の完了条件（`formats.md` の着手の条件にある種類ごとの節）と「振る舞いの例」を全て満たすか．範囲の外の変更がないか．
2. **正しさ**：境界値，空の入力，error の経路，同時実行，時刻と timezone．
3. **security**：入力の検証，認可，secret と個人情報の扱い，新しい依存 package の理由．
4. **test**：例の各行に test があるか．test が実装の細部ではなく振る舞いを確かめているか．検出力を確かめたか．
5. **周りへの影響**：公開 API，設定，data の互換性．消したコードの呼び出し元．
6. **PR 本文**：`formats.md` の規則に合うか．「確かめたこと」が今の head の結果だけか．

## 手順

command の例の `$repo` は，`relay-core` の「command の例について」で設定する．

1. **材料を集める**．

   ```bash
   gh pr view <PR> --json number,title,body,headRefOid,baseRefName,isDraft,closingIssuesReferences
   gh pr diff <PR>
   gh issue view <閉じる Issue> --json title,body
   ```

   `headRefOid` を，レビューする head として控える．
2. **方法を選ぶ**．`review.independent` に従う（`profile.md` の「独立レビュー」）．`auto` と `github` では手順 3 に進む．
   それ以外の値では手順 4 に進む．
3. **GitHub で `@codex review` を依頼する**．Codex の GitHub 連携は，PR の comment の `@codex review` を読んでレビューする．
   bot の login は `chatgpt-codex-connector[bot]` である．

   ```bash
   bot='chatgpt-codex-connector[bot]'
   since=$(date -u +%Y-%m-%dT%H:%M:%SZ)
   url=$(gh pr comment <PR> --body "@codex review")
   request_id=${url##*issuecomment-}    # 依頼の comment の id
   ```

   前の依頼の応答を待っている間は，新しく依頼しない．30 秒ごとに次の 4 つを読み，`since` より後の bot の応答を探す．

   ```bash
   # review（本文と，レビューした commit）
   gh api "repos/$repo/pulls/<PR>/reviews" --paginate \
     --jq ".[] | select(.user.login == \"$bot\" and .submitted_at > \"$since\") | [.id, .commit_id, .body] | @tsv"
   # 行ごとの指摘
   gh api "repos/$repo/pulls/<PR>/comments" --paginate \
     --jq ".[] | select(.user.login == \"$bot\" and .created_at > \"$since\") | [.id, .path, .line, .body] | @tsv"
   # PR への comment（指摘なし，利用上限，error の知らせ）
   gh api "repos/$repo/issues/<PR>/comments" --paginate \
     --jq ".[] | select(.user.login == \"$bot\" and .created_at > \"$since\") | [.id, .body] | @tsv"
   # 依頼の comment への reaction（👀 はレビュー中，👍 は指摘なし）
   gh api "repos/$repo/issues/comments/$request_id/reactions" \
     --jq ".[] | select(.user.login == \"$bot\") | .content"
   ```

   結果を次の表で判断する．

   | bot の応答 | 判断 | 次の手順 |
   | --- | --- | --- |
   | review が付いた | 行ごとの指摘を読む．review の `commit_id` が控えた head と同じか確かめる | 手順 5 |
   | 指摘がないという comment，または 👍 の reaction が付いた | 依頼から今までに PR の head が変わっていなければ「P0/P1 なし」とする | 手順 5 |
   | 利用上限（`usage limits`）や error の comment が付いた | GitHub では受けられない | 手順 4 |
   | 10 分待っても，👀 の reaction も他の応答もない | 連携がない，または止まっているとみなす | 手順 4 |

   指摘なしの comment と reaction は，レビューした commit を示さない．そのため，`gh pr view <PR> --json headRefOid` が
   控えた head のままであることを確かめる．review の `commit_id` が違う場合や，head が変わった場合は，今の head で手順 3 をやり直す．
   👀 の reaction があり応答がまだない場合は，さらに 10 分まで待つ．
   `review.independent` が `github` の場合は，手順 4 に進まずに止まり，理由を利用者に報告する．
4. **代わりの方法でレビューし，結果を PR に comment する**．
   - `codex review` などの command は，今の作業場所の checkout をレビューする．別の branch にいるまま実行すると，
     対象の PR ではないものをレビューしてしまう．レビュー専用の worktree に PR の head を取り出し，そこで実行する．

     ```bash
     git fetch origin <base> "pull/<PR>/head:relay-review-<PR>"
     git worktree add <一時的な path> relay-review-<PR>
     git -C <一時的な path> rev-parse HEAD     # headRefOid と一致することを確かめる
     ```

     今の作業場所が既に PR の branch で，`git rev-parse HEAD` が `headRefOid` と一致する場合は，そのまま使ってよい．
   - `profile.md` の順で方法を選び，その作業場所で実行する．
     別の agent や subagent には，PR 番号，この skill の「重要度」と「観点」，次の出力形式を渡す．
     別の agent は file を変更せず，指摘だけを返すようにする．

     ```text
     [P1] src/invitations/resend.ts:42
     問題：有効な招待も再送できる．
     根拠：Issue #12 の例の表の 2 行目（有効な招待は再送しない）に反する．
     提案：status が expired でない場合は再送しない．
     ```

     指摘のない場合は「P0/P1 なし」と，確かめた観点の一覧を返すようにする．
   - 結果を **必ず** PR に comment する．1 行目に，使った方法と，GitHub で受けられなかった理由を書く．
     この comment，返信，PR 本文には `@codex` を書かない．code span の中でも，bot が新しいレビューを始める．
     指摘には `1.`，`2.` のように番号を振り，返信で参照できるようにする．

     ```markdown
     独立レビュー（手元の codex review．GitHub の Codex 連携は利用上限のため）
     レビューした head: `a1b2c3d`

     1. [P1] `src/invitations/resend.ts:42`：有効な招待も再送できる．Issue #12 の例の表の 2 行目に反する．
     2. [P2] `src/invitations/resend.ts:60`：error の文言が他の API と違う．
     ```

   - 片付ける．`git worktree remove <一時的な path>` で worktree を消す．`relay-review-<PR>` branch は，
     独自の commit がないことを確かめてから `git branch -D relay-review-<PR>` で消す（`relay-core` の承認の例外）．

     ```bash
     git rev-list <headRefOid>..relay-review-<PR>    # 何も出なければ，独自の commit はない
     ```

     何か出た場合は消さずに，利用者に報告する．
5. **指摘を選別する**．根拠が差分にも Issue にもない指摘は捨てる．同じ指摘はまとめる．
   重要度は「指摘の重要度」の表で付け直す．
6. **直して，PR 上で返信する**．利用者がレビューだけを依頼した場合は，直さずに手順 8 に進む．それ以外の場合は次を行う．
   - P0 と P1 は全て直す．P2 以下は，明らかな誤りでない限り直さない．
   - `checks.full` を実行し，commit して push する．
   - 直した指摘には，直した commit の短い SHA と内容を返信する．P0 と P1 を直さない場合は，理由を返信する．
   - P2 以下で直さないものには，個別に返信しなくてよい．PR の「見てほしいところ」に
     「P2 以下は許容範囲として対応しない」と 1 行書く．
   - 返信の場所は，指摘の場所に合わせる．

     ```bash
     # GitHub の行ごとの指摘には，その thread に返信する
     gh api "repos/$repo/pulls/<PR>/comments/<comment の id>/replies" -f body="abc1234 で直した．期限切れのときだけ再送する．"
     # 手順 4 の comment の指摘には，番号を付けて 1 つの comment で返信する
     gh pr comment <PR> --body-file reply.md
     ```

7. **もう一度レビューする**．P0 か P1 を直した場合は，新しい head で手順 2 からやり直す．
   再レビューは 2 回までにする．それでも P0 か P1 が残る場合は，止まって利用者に報告する．
8. **PR 本文を更新する**．「確認した head:」と「確かめたこと」を今の head の結果にし，「Issue からの変更」に
   レビューで変えたことを書く．独立レビューの方法と，レビューした head を「確かめたこと」の表に書く．
   CI は `gh pr checks <PR> --watch` で待ってから書く．
9. **報告する**．指摘と対応（直した commit，または直さない理由），今の head と CI の結果，
   利用者が判断すること（Draft 解除と merge）を表で示す．

## してはいけないこと

- 承認なしに approve，Draft 解除，merge すること．
- 人に review を依頼すること（`@codex review` の comment は除く）．
- レビューのついでに範囲の外の変更を入れること．
- レビューの結果や対応を，PR に書かずに手元の報告だけで済ませること．
- 独自の commit がある `relay-review-<PR>` branch を消すこと．
