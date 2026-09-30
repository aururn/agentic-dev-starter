---
name: relay-review
description: PR の差分を，対応する Issue の約束と照らして，実装した agent とは別の目で検査する．P0 と P1 の指摘を直し，PR 本文を今の head の結果に更新する．「PR をレビューして」「#34 を確認して」と依頼されたとき，または relay-build の最後に使う．
---

# relay-review

引数は PR の番号とする．ない場合は，今の branch の PR を対象にする．

## 先に読む

- [../relay-core/SKILL.md](../relay-core/SKILL.md) と `.agents/relay.yml`（`review.independent`）
- [../relay-core/references/formats.md](../relay-core/references/formats.md) の PR の規則

## 指摘の重要度

| 重要度 | 意味                                                        | 扱い                         |
| ------ | ----------------------------------------------------------- | ---------------------------- |
| P0     | data の破壊，security の穴，secret の漏洩，base branch が壊れる | 必ず直す                     |
| P1     | 「完了の姿」または「振る舞いの例」を満たさない，回帰，test の欠落 | 必ず直す                     |
| P2     | 保守しにくさ，重複，軽い境界の漏れ                          | 直すか，直さない理由を書く   |
| P3     | 好みの範囲の提案                                            | 任意                         |

## 観点

1. **約束**：Issue の「完了の姿」と「振る舞いの例」を全て満たすか．範囲の外の変更がないか．
2. **正しさ**：境界値，空の入力，error の経路，同時実行，時刻と timezone．
3. **security**：入力の検証，認可，secret と個人情報の扱い，新しい依存 package の理由．
4. **test**：例の各行に test があるか．test が実装の細部ではなく振る舞いを確かめているか．検出力を確かめたか．
5. **周りへの影響**：公開 API，設定，data の互換性．消したコードの呼び出し元．
6. **PR 本文**：`formats.md` の規則に合うか．「確かめたこと」が今の head の結果だけか．

## 手順

1. **材料を集める**．

   ```bash
   gh pr view <PR> --json number,title,body,headRefOid,baseRefName,isDraft,closingIssuesReferences
   gh pr diff <PR>
   gh issue view <閉じる Issue> --json title,body
   ```

2. **別の目でレビューする**．`review.independent` に従って方法を選ぶ（`profile.md` の「独立レビュー」）．
   別の agent や subagent には，PR 番号，この skill の「重要度」と「観点」，次の出力形式を渡す．
   別の agent は file を変更せず，指摘だけを返すようにする．

   ```text
   [P1] src/invitations/resend.ts:42
   問題：有効な招待も再送できる．
   根拠：Issue #12 の例の表の 2 行目（有効な招待は再送しない）に反する．
   提案：status が expired でない場合は再送しない．
   ```

   指摘のない場合は「P0/P1 なし」と，確かめた観点の一覧を返すようにする．
3. **指摘を選別する**．根拠が差分にも Issue にもない指摘は捨てる．同じ指摘はまとめる．
4. **直す**．利用者がレビューだけを依頼した場合は直さずに報告して終える．それ以外の場合は次を行う．
   - P0 と P1 は全て直す．P2 は直すか，直さない理由を PR の「見てほしいところ」に書く．
   - `checks.full` を実行し，commit して push する．
   - 新しい head で手順 2 からやり直す．P0 と P1 がなくなるまで繰り返す．
5. **PR 本文を更新する**．「確認した head:」と「確かめたこと」を今の head の結果にし，「Issue からの変更」に
   レビューで変えたことを書く．CI は `gh pr checks <PR> --watch` で待ってから書く．
6. **報告する**．指摘と対応（直した commit，または直さない理由），今の head と CI の結果，
   利用者が判断すること（Draft 解除と merge）を表で示す．

## してはいけないこと

- 承認なしに approve，Draft 解除，merge すること．
- レビューのついでに範囲の外の変更を入れること．
- 利用者の依頼なしに，指摘を PR の comment として投稿すること．
