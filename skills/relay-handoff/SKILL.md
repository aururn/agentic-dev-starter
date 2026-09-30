---
name: relay-handoff
description: 作業中の Issue を中断する，再開する，別の人や別の agent に渡すときに，バトン comment と Assignee と WIP の push で状態を GitHub に残す．「ここで止めて」「続きから」「Codex に渡して」「引き継いで」と依頼されたとき，または session が終わる前に使う．
---

# relay-handoff

## 先に読む

- [../relay-core/SKILL.md](../relay-core/SKILL.md) と [../relay-core/references/baton.md](../relay-core/references/baton.md)

## 中断する

1. **手元の状態を集める**．`git status`，push していない commit，起動中の process，local の data を確かめる．
2. **WIP を push する**．未完成でも，作業 branch に commit して push する．commit message は `relay.yml` の `commit` に従い，
   未完成であることが分かるようにする（例：`wip: 再送の transaction 化の途中`）．
   push できないもの（secret を含む file，巨大な生成物）は push せず，「手元だけにあるもの」に書く．
3. **PR を更新する**．Draft PR があれば，「確認した head:」と「確かめたこと」を今の head にする．未実行のものは ⏭ にする．
4. **バトンを `中断` にする**．「済んだこと」「次の一手」「止まっている理由」「手元だけにあるもの」を書く．
   状態 label を `relay:ready` にする．Assignee は，利用者が外すよう依頼した場合だけ外す．
5. **報告する**．バトンの URL と次の一手を示す．

## 待機にする

依存，利用者の判断，外部の返事を待つときは，バトンを `待機` にして，何を誰から待っているかを「止まっている理由」に書く．
状態 label を `relay:blocked` にする．待っている相手が GitHub の Issue なら，blocked by も登録する．

## 再開する

1. **バトンを読む**．`次の一手` と `手元だけにあるもの` を確かめる．
2. **担当を確かめる**．自分以外が Assignee の場合は，利用者が交代を依頼していない限り止まって報告する．
3. **branch を取り込む**．

   ```bash
   git fetch origin
   git switch <branch> && git pull --ff-only
   ```

   worktree を使う場合は，その作業場所に移る．
4. **ずれを確かめる**．base の最新と比べ，衝突がないか確かめる．バトンの内容と branch の状態が食い違う場合は，
   branch の状態を正として，食い違いを報告する．
5. **バトンを `実装中` にし**，状態 label を `relay:working` にしてから，`relay-build` の続きの手順に戻る．

## 渡す

別の人または別の agent に渡すときは，中断の手順を行った後に次を行う．

- 利用者が指定した相手を Assignee にし，自分を外す．
- バトンの担当を相手にし，「次の一手」を相手が最初にやることにする．
- agent に渡す場合は，相手の agent で実行する依頼文を報告に含める．例：`$relay-build 12` または `/relay-build 12`．

## してはいけないこと

- secret を含む変更を，WIP だからといって push すること．
- 他の人の branch に，その人の依頼なしに push すること．
- バトンを 2 つ以上作ること．見つからない場合だけ作る．
