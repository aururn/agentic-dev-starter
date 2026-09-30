---
name: relay-plan
description: 利用者の依頼を，1 つの PR で完了する大きさの GitHub Issue に分け，大項目（epic），sub-issue，依存，label，バトンを作る．「Issue に分けて」「タスクに分解して」「〇〇を作りたい」「計画を立てて」と依頼されたときに使う．
---

# relay-plan

## 先に読む

- [../relay-core/SKILL.md](../relay-core/SKILL.md) と，そこから指す `profile.md`，`formats.md`，`github.md`
- 依頼に関係する code と docs

## 手順

1. **重複を調べる**．open の Issue と，最近 close された Issue を検索し，同じ目的のものがあれば新しく作らずに報告する．

   ```bash
   gh issue list --state all --limit 100 --search "<依頼の要点の語>" --json number,title,state,labels
   ```

2. **分からないことを先に分ける**．依頼の中に，調べないと方針を決められないことがあれば，それを調査（spike）の
   Issue にして，依存の先頭に置く．調査の結果によって変わる Issue は，まだ作らずに「調査の後に作る」と記録する．
3. **分ける**．次の順に考える．
   1. 利用者から見て，途中でも価値がある状態の区切りを探す（例：「招待できる」→「再送できる」→「取り消せる」）．
   2. 各区切りを，1 回のレビューで読める大きさ（S または M）にする．
   3. 依存は最小にする．並行して進められるものは依存させない．
   4. 層（DB，API，UI）だけで分けるのは，各層を単独で確かめられる場合に限る．
   5. Issue が 1 件で済む場合は epic を作らない．
4. **案を見せて承認をもらう**．GitHub に書き込む前に次の表を見せ，承認されるまで作らない．

   | # | title | 種類 | 大きさ | 依存 | 完了の姿（要約） |
   | - | ----- | ---- | ------ | ---- | ---------------- |

   並行して進められる組み合わせと，最初に着手できる Issue も書く．
5. **label を確かめる**．`relay:*` の状態 label と，`relay.yml` の `labels` にある label がなければ，
   `relay-adopt` の `assets/setup-labels.sh` を実行するか，利用者に確認する．
6. **Issue を作る**．`formats.md` の書式で本文を file に書き，作る．大項目を先に作る．

   ```bash
   gh issue create --title "<title>" --body-file issue.md --label "<種別>,<大きさ>,relay:ready"
   ```

   - 大項目には種別と大きさの label を付けず，`epic` の label だけを付ける（label 名は `labels.type.epic`）．
   - 依存がある Issue には `relay:ready` の代わりに `relay:blocked` を付ける．
   - `projects` が設定されていれば Project に追加する．
7. **関係を登録する**．`github.md` の手順で，sub-issue と blocked by を登録する．
8. **確かめる**．作った Issue を読み直し，本文，label，親子関係，依存が案と一致することを確認する．
9. **報告する**．作った Issue の番号と title，依存の順序，今すぐ着手できる Issue，並行できる組み合わせを表で示す．
   次の一手として `relay-build <番号>` を示す．

## してはいけないこと

- 承認の前に Issue を作ること．
- 大きさ L の Issue を作業として作ること．
- 本文に担当，依存，親子関係を書くこと（API が使えない場合の代わりを除く）．
