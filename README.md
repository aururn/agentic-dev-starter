# Relay

**Issue を単位に，人と coding agent（Codex / Claude Code）が GitHub 上で作業を引き継ぐための skill pack．**

依頼を Issue に分け，Issue ごとに branch，実装，Draft PR，別の agent によるレビュー，merge の後片付けまでを進めます．
作業の状態は会話ではなく GitHub（Issue のバトン comment）に置くので，session が替わっても，Codex から Claude Code に
替わっても，同じところから続けられます．既存の repository にも，新しい repository にも入れられます．

```text
relay-plan ──▶ relay-build ──▶ relay-review ──▶ relay-land
 依頼を分ける    1 Issue を実装    別の agent で検査   merge と後片付け
   ▲ 承認                                            ▲ merge の依頼
                 relay-handoff：中断，再開，交代（どの段階からでも）
```

人が判断するのは **分解案の承認** と **merge の依頼** の 2 か所だけです．

## 入れる

repository の root で実行します（Node.js が必要です）．

```bash
npx skills add aururn/agentic-dev-starter --skill '*' -a codex -a claude-code
```

次に，agent に導入を依頼します．agent が repository を調べて運用設定の案を出すので，確かめて承認します．

| Codex          | Claude Code    |
| -------------- | -------------- |
| `$relay-adopt` | `/relay-adopt` |

`relay-adopt` は次を行います．既存の file は上書きせず，違いがある場合は提案だけにします．

- `.agents/relay.yml`（運用設定）を，merge 済みの PR，commit，CI，scripts から推定して作る
- `AGENTS.md` と `CLAUDE.md` に Relay の節を追記する（marker の間だけを管理する）
- Issue の template（作業，不具合，調査，大項目）と PR の template を置く
- PR 本文を検査する workflow（`relay-pr-policy`）と label を足す

更新は `npx skills update` で取り込めます．

## 使う

| やりたいこと                     | Codex               | Claude Code         |
| -------------------------------- | ------------------- | ------------------- |
| 依頼を Issue に分ける            | `$relay-plan 〇〇を作りたい` | `/relay-plan 〇〇を作りたい` |
| Issue を実装して Draft PR を出す | `$relay-build 12`   | `/relay-build 12`   |
| PR を別の目でレビューする        | `$relay-review 34`  | `/relay-review 34`  |
| merge して後片付けをする         | `$relay-land 34`    | `/relay-land 34`    |
| 中断，再開，交代                 | `$relay-handoff`    | `/relay-handoff`    |

## 特徴

**repository ごとの違いは `.agents/relay.yml` に書く．** base branch，branch 名，PR title の規則，検査の command，
独立レビューの方法，Projects，stack，worktree，release PR を設定できます．skill 自体は全ての repository で同じです．

```yaml
base: staging
branch: "{agent}/{number}-{slug}"
pr_title: plain
checks:
  fast: ["pnpm lint"]
  full: ["pnpm lint", "pnpm test", "pnpm build"]
  gated: ["pnpm test:e2e:live"]   # 承認がないと実行しない
review:
  independent: auto               # PR に @codex review と comment して GitHub 上でレビューを受ける
release: { from: staging, to: main }
```

**状態はバトン comment に置く．** Issue ごとに 1 つの comment を上書きし，状態，担当，branch，PR，次の一手，
手元だけにある変更を書きます．次の session は，これを読めば再開できます．

**振る舞いは例の表で書く．** Issue の要求を文章ではなく表で書くので，境界と例外が見やすく，そのまま test の case になります．

| 状況                   | 入力・操作 | 期待する結果                                 |
| ---------------------- | ---------- | -------------------------------------------- |
| 管理者，招待は期限切れ | 再送する   | 新しい招待を 1 件作り，古い招待を無効にする |
| 管理者，招待は有効     | 再送する   | 再送せず，「まだ有効です」と返す            |
| 管理者でない member    | 再送する   | 権限エラーを返す                             |

**PR は 5 節だけ．** 変わること，見てほしいところ，Issue からの変更，確かめたこと，戻し方．
「確かめたこと」には結果を得た commit（`確認した head:`）を書き，CI が今の head と一致するかを検査します．

**merge の後まで面倒を見る．** Issue が閉じたかの確認，止めていた Issue の解除，stack の付け替え，worktree の片付けを行います．

## CI の検査（relay-pr-policy）

| 検査                                      | Draft の間 | Draft 解除後 |
| ----------------------------------------- | ---------- | ------------ |
| 閉じる Issue（`Closes #N`）が 1 件だけか  | 失敗       | 失敗         |
| `確認した head:` が今の head と一致するか | 警告       | 失敗         |
| 「確かめたこと」に ❌ が残っていないか    | 警告       | 失敗         |

branch protection の required check に `relay-pr-policy` を足すと，古い検査結果のまま merge されるのを防げます．

## 承認が必要な操作

agent は次の操作を，利用者が明示して依頼した場合だけ行います．

- PR の Draft 解除，merge，人へのレビュー依頼，approve
- force push，公開済みの履歴の書き換え
- `checks.gated` の検査（有料の API，外部サービス，本番環境）
- 本番配備，外部サービスの設定変更，secret の変更

branch の作成，commit，作業 branch への push，Draft PR，`@codex review` とレビューの結果の comment，label，バトンの更新は，
Issue 単位の依頼に含まれるものとして進めます．

## 構成

```text
skills/
  relay-core/       共通の規則．運用設定，Issue と PR の書式，バトン，GitHub の操作
  relay-plan/       依頼を Issue に分ける
  relay-build/      1 Issue を実装して Draft PR を出す
  relay-review/     別の agent でレビューして直す
  relay-land/       merge と後片付け
  relay-handoff/    中断，再開，交代
  relay-adopt/      repository に導入する．assets/ に導入先へ置く file がある
docs/               設計（concept.md）と判断の記録（decisions/）
scripts/ tests/     この pack 自身の検査
```

## 参考にしたもの

Issue を実装前の約束，PR を実装後の記録として分ける考え方は，
[ReoHakase/enterprise-agentic-saas-starter](https://github.com/ReoHakase/enterprise-agentic-saas-starter) の運用を参考にしました．
文書と skill の本文，書式，仕組みはこの repository で独自に書いたものです．

## License

[Apache License 2.0](LICENSE)
