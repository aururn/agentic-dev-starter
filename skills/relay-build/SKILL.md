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
   gh api --paginate -X GET "repos/$repo/pulls" -f state=open -f per_page=100 --jq '.[] | select((.body // "") | gsub("(?s)<!--.*?-->"; "") | gsub("(?s)`{3}.*?`{3}"; "") |
     test("(^|[^[:alnum:]_])(close[sd]?|fix(e[sd])?|resolve[sd]?):?[[:space:]]+#<番号>($|[^0-9])"; "i")) |
     [.number, .head.ref, .draft] | @tsv'
   gh api --paginate "repos/$repo/issues/<番号>/dependencies/blocked_by" --jq '.[] | [.number, .state] | @tsv'
   ```

   対応する open PR は，本文に closing keyword（`Closes` など）とこの番号がある PR だけとする．
   「関連：#N」のように番号があるだけの PR は数えない．
   依存の API が失敗した場合は，`github.md` のとおり本文の `依存：#N` から番号を取り，各 Issue の状態を読む．
   open の Issue があれば，open の依存として手順 2 で扱う．

   バトンがあれば読む（`relay-core/references/baton.md`）．`中断` のバトンがある場合は，`relay-handoff` の再開の手順に従う．
2. **着手できるか判断する**．`formats.md` の[着手の条件](../relay-core/references/formats.md#着手の条件)を満たさない場合は，
   理由を報告して止まる．大きさ L の場合は `relay-plan` で分けることを提案する．
3. **担当を取る**．自分を Assignee にし，状態 label を `relay:working` にして，バトンを `実装中` にする（なければ作る）．
   直後に Assignee を読み直し，他の人が同時に担当になっていたら止まって報告する．
4. **branch を作る**．調査 Issue で，成果物が Issue の comment だけの場合は，branch を作らずに
   下の[成果が comment だけの調査](#成果が-comment-だけの調査)に進む．
   名前は `relay.yml` の `branch` に従う．起点は次のとおりにする．
   - 通常：`base`
   - `stack: true` で，依存先の PR がまだ merge されていない場合：まだ merge されていない全ての依存先の PR を含む branch．
     依存先が 1 つならその PR の branch にする．複数なら，他の全ての依存先の PR の上に stack している PR の branch にする．
     PR の branch A が branch B に含まれるかは `git merge-base --is-ancestor origin/<A> origin/<B>` で確かめる．
     そのような branch がない場合は，着手の条件を満たさない（手順 2 で止まる）
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
10. **自分で見直す**．未 commit の変更と未追跡の file も含めて，起点からの全ての変更を `relay-review` の観点で読み，
    P0 と P1 を直す．

    ```bash
    git diff $(git merge-base <起点> HEAD)       # commit 済みと作業中の変更
    git ls-files --others --exclude-standard     # 未追跡の file．一覧の file は中身も読む
    ```

    直した場合は，手順 8 に戻って検査をやり直し，直した後の変更でもう一度この手順を行う．
11. **commit して push する**．`relay.yml` の `commit` に従い，1 commit に 1 つの関心事にする．
    手順 8 から 10 で確かめた変更だけを commit する．

    ```bash
    git push -u origin HEAD
    ```

12. **Draft PR を作る**．この branch の open PR が既にある場合は，作り直さずにその PR の本文を更新する．
    ない場合は，`formats.md` の PR の書式で本文を file に書き，Draft で作る．
    - 「確認した head:」には今の head の短い SHA を書く．
    - 表には，手順 10 で最後に直した後に，手順 8 と 9 で実行した結果だけを書く．直す前の結果は書かない．
    - CI の行は，結果が出るまで ⏭ にしておく．

    ```bash
    gh pr create --draft --base <起点> --title "<title>" --body-file pr.md
    gh pr edit <PR> --body-file pr.md    # 既にある PR の本文を更新する
    ```

13. **CI を待つ**．`gh pr checks <PR> --watch` で今の head の結果を待つ．
    - 失敗した場合：直して，手順 8 から 11 をやり直す．新しい PR は作らない．既存の PR の本文の「確認した head:」と表を
      新しい head の結果に更新し（CI の行は ⏭ に戻す），この手順で CI をもう一度待つ．
    - 成功した場合：PR 本文の CI の行と「確認した head:」を更新する．
14. **状態を更新する**．状態 label を `relay:review` にし，バトンを `レビュー待ち` にして PR 番号を書く．
15. **レビューに回す**．`relay-review <PR>` を実行する．
16. **報告する**．PR の URL，確かめたことの表，残った P2 以下の指摘，新しい Issue の候補を示す．
    Draft 解除と merge は利用者に任せる（`relay-land`）．

## 成果が comment だけの調査

調査 Issue で，成果物が Issue の comment だけの場合（例：比較表と結論）は，branch，commit，PR を作らない．
ADR など file の変更も成果物に含む場合は，この節を使わず，通常の手順 4 から進める．

1. **調べる**．Issue の「決め方」の各項目を確かめる．「時間の上限」に達したら，途中の結果と，続けるかどうかの提案を
   comment に書き，状態 label を `relay:blocked` にし，バトンを `待機` にして止まる．
2. **成果を comment に書く**．「成果物」に書かれたものを 1 つの comment にまとめる．各項目の結論と，確かめた方法を書く．

   ```bash
   gh issue comment <番号> --body-file result.md
   ```

3. **Issue を閉じる**．comment を読み直して内容を確かめてから閉じる．状態 label を外し，バトンを `完了` にする．

   ```bash
   gh issue close <番号> --reason completed
   gh issue edit <番号> --remove-label relay:working
   ```

4. **止めていた Issue を解除する**．PR がないため `relay-land` は実行されない．`relay-land` の手順 8 と同じく，
   この Issue が止めていた `relay:blocked` の Issue のうち，open の依存が残っていないものを `relay:ready` にし，
   バトンがあれば `準備済み` にする．
5. **報告する**．成果の comment の URL と結論，着手できるようになった Issue を示す．結論から新しい Issue が必要な場合は，
   候補として示す．

## してはいけないこと

- Draft 解除，merge，force push，`checks.gated` の実行を，承認なしに行うこと．
- 範囲の外の変更を同じ PR に入れること．
- 実行していない確認を ✅ にすること．古い head の結果を今の head の結果として書くこと．
