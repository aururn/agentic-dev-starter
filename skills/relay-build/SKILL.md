---
name: relay-build
description: GitHub Issue を 1 件実装し，作業 branch，commit，push，Draft PR，CI の確認，バトンの更新までを行う．「#12 を実装して」「この Issue を進めて」「次の Issue をやって」と依頼されたときに使う．
---

# relay-build

引数は Issue の番号とする．番号がない場合は，`relay:ready` の open Issue を依存の少ない順に 5 件まで示し，
利用者に選んでもらう．

## 先に読む

- [../relay-core/SKILL.md](../relay-core/SKILL.md) と `.agents/relay.yml`
- `AGENTS.md` と，Issue の「手がかり」にある code と docs

## 手順

1. **Issue と周りの状態を読む**．

   ```bash
   gh issue view <番号> --json number,title,body,labels,assignees,state
   gh issue develop --list <番号>
   gh pr list --state open --search "<番号> in:body" --json number,headRefName,isDraft
   gh api "repos/$repo/issues/<番号>/dependencies/blocked_by" --jq '.[] | [.number, .state] | @tsv'
   ```

   バトンがあれば読む（`relay-core/references/baton.md`）．`中断` のバトンがある場合は，`relay-handoff` の再開の手順に従う．
2. **着手できるか判断する**．`formats.md` の[着手の条件](../relay-core/references/formats.md#着手の条件)を満たさない場合は，
   理由を報告して止まる．大きさ L の場合は `relay-plan` で分けることを提案する．
3. **担当を取る**．自分を Assignee にし，状態 label を `relay:working` にして，バトンを `実装中` にする（なければ作る）．
   直後に Assignee を読み直し，他の人が同時に担当になっていたら止まって報告する．
4. **branch を作る**．名前は `relay.yml` の `branch` に従う．起点は次のとおりにする．
   - 通常：`base`
   - `stack: true` で，依存先の PR がまだ merge されていない場合：依存先の PR の branch
   - 他の Issue と並行して作業する場合で `worktree` があるとき：`github.md` の worktree の手順で作業場所を分ける

   ```bash
   git fetch origin
   gh issue develop <番号> --name <branch> --base <起点> --checkout
   ```

5. **作り方を決める**．変更の前に，次を短くまとめる．Issue と違う判断をしたら，理由と一緒に控えて，PR の
   「Issue からの変更」に書く．
   - 「振る舞いの例」の各行を，どの test で確かめるか
   - 変えてはいけないもの（公開 API，data，設定）
   - 範囲の外に置くもの
6. **test を先に書く**．「振る舞いの例」の行を test にし，失敗することを確かめてから実装する．
7. **実装する**．Issue の範囲だけを変える．範囲の外の問題を見つけたら直さずに控え，最後に新しい Issue の候補として報告する．
8. **検査する**．`checks.fast` を繰り返し実行し，最後に `checks.full` を全て実行する．`checks.gated` は承認なしに実行しない．
9. **検出力を確かめる**．不具合の修正と，重要な規則では，修正を一時的に外して test が失敗することを確かめ，元に戻す．
   戻した後に `checks.full` がもう一度成功することを確かめる．
10. **自分で見直す**．`git diff <起点>...HEAD` を `relay-review` の観点で読み，P0 と P1 を直す．
11. **commit して push する**．`relay.yml` の `commit` に従い，1 commit に 1 つの関心事にする．

    ```bash
    git push -u origin HEAD
    ```

12. **Draft PR を作る**．`formats.md` の PR の書式で本文を file に書き，Draft で作る．
    - 「確認した head:」には今の head の短い SHA を書き，手順 8 と 9 で実行した結果を表に書く．
    - CI の行は，結果が出るまで ⏭ にしておく．

    ```bash
    gh pr create --draft --base <起点> --title "<title>" --body-file pr.md
    ```

13. **CI を待つ**．`gh pr checks <PR> --watch` で今の head の結果を待つ．失敗したら直して push し，手順 8 からやり直す．
    成功したら，PR 本文の CI の行と「確認した head:」を更新する．
14. **状態を更新する**．状態 label を `relay:review` にし，バトンを `レビュー待ち` にして PR 番号を書く．
15. **レビューに回す**．`relay-review <PR>` を実行する．
16. **報告する**．PR の URL，確かめたことの表，残った P2 以下の指摘，新しい Issue の候補を示す．
    Draft 解除と merge は利用者に任せる（`relay-land`）．

## してはいけないこと

- Draft 解除，merge，force push，`checks.gated` の実行を，承認なしに行うこと．
- 範囲の外の変更を同じ PR に入れること．
- 実行していない確認を ✅ にすること．古い head の結果を今の head の結果として書くこと．
