# Relay

[![CI](https://github.com/aururn/agentic-dev-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/aururn/agentic-dev-starter/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/aururn/agentic-dev-starter)](LICENSE)
[![Codex](https://img.shields.io/badge/Codex-supported-111111)](#使い始める)
[![Claude Code](https://img.shields.io/badge/Claude_Code-supported-D97757)](#使い始める)

Issue を単位に，人と coding agent が GitHub 上で作業を引き継ぐための skill pack です．

依頼を Issue に分け，Issue ごとに実装，Draft PR，別の agent によるレビュー，merge の後片付けまでを agent が進めます．
人が判断するのは，分解案の承認と merge の依頼の 2 か所だけです．

## Highlights

- **状態は GitHub に残る．** Issue ごとの「バトン」comment に，状態と次の一手を置きます．session が替わっても，Codex から Claude Code に替わっても，同じところから続けられます．
- **1 Issue = 1 PR．** 依頼を 1 回のレビューで読める大きさの sub-issue に分けます．触る file が重ならない Issue は，並列に進められます．
- **レビューも GitHub 上で．** PR に `@codex review` と comment してレビューを受け，指摘と対応を PR に残します．
- **確かめた結果を信用できる．** PR には，結果を得た commit を書きます．CI が今の head と照らし，古い結果のままの merge を止めます．
- **repository ごとの違いは設定 1 つ．** base branch，branch 名，検査の command などは `.agents/relay.yml` に書きます．skill はどの repository でも同じです．
- **既存の repository にも入る．** 導入の skill が repository を調べて設定の案を作ります．既存の file は上書きしません．

## 使い始める

repository の root で skill を入れます．Codex と Claude Code の両方に入ります（Node.js が必要です）．

```bash
npx skills add aururn/agentic-dev-starter --skill '*' -a codex -a claude-code
```

次に，agent に導入を頼み，出てきた運用設定の案を承認します．

```text
/relay-adopt          # Codex では $relay-adopt
```

あとは作りたいものを頼むだけです．

```text
/relay-plan 招待メールを再送できるようにしたい
/relay-build 12
```

更新は `npx skills update` で取り込めます．

## 流れ

| | 1. 分ける | 2. 作る | 3. 確かめる | 4. 入れる |
| --- | --- | --- | --- | --- |
| skill | `relay-plan` | `relay-build` | `relay-review` | `relay-land` |
| すること | 依頼を epic と sub-issue に分ける | 1 Issue を実装し，Draft PR を出す | 別の agent が PR 上でレビューする | merge し，Issue と branch を片付ける |
| 人の判断 | 分解案を承認する | | | merge を依頼する |

途中で止めるとき，再開するとき，担当を替えるときは `relay-handoff` を使います．

## コマンド

| やりたいこと | Claude Code | Codex |
| --- | --- | --- |
| 導入する | `/relay-adopt` | `$relay-adopt` |
| 依頼を Issue に分ける | `/relay-plan <依頼>` | `$relay-plan <依頼>` |
| Issue を実装して Draft PR を出す | `/relay-build <Issue>` | `$relay-build <Issue>` |
| PR をレビューする | `/relay-review <PR>` | `$relay-review <PR>` |
| merge して後片付けをする | `/relay-land <PR>` | `$relay-land <PR>` |
| 中断，再開，交代 | `/relay-handoff` | `$relay-handoff` |

## Issue と PR の書き方

Issue の要求は，文章ではなく例の表で書きます．境界と例外が見やすく，そのまま test の case になります．

| 状況 | 入力・操作 | 期待する結果 |
| --- | --- | --- |
| 管理者，招待は期限切れ | 再送する | 新しい招待を 1 件作り，古い招待を無効にする |
| 管理者，招待は有効 | 再送する | 再送せず，「まだ有効です」と返す |
| 管理者でない member | 再送する | 権限エラーを返す |

PR は，変わること，見てほしいところ，Issue からの変更，確かめたこと，戻し方の 5 節で書きます．

## 設定

`.agents/relay.yml` の例です．

```yaml
base: staging
branch: "{agent}/{number}-{slug}"
pr_title: plain
checks:
  fast: ["pnpm lint"]
  full: ["pnpm lint", "pnpm test", "pnpm build"]
  gated: ["pnpm test:e2e:live"]   # 承認がないと実行しない
review:
  independent: auto
release: { from: staging, to: main }
```

## Documentation

| 文書 | 内容 |
| --- | --- |
| [設定の全項目](skills/relay-core/references/profile.md) | `.agents/relay.yml` の項目と既定値 |
| [Issue と PR の書式](skills/relay-core/references/formats.md) | 種類ごとの書式，着手の条件，CI の検査 |
| [バトン](skills/relay-core/references/baton.md) | 引き継ぎの comment の書式と操作 |
| [共通の規則](skills/relay-core/SKILL.md) | 承認が必要な操作，書くときの規則 |
| [設計](docs/concept.md) | Relay が解く問題と仕組み |
| [判断の記録](docs/decisions/README.md) | ADR |

## License

[Apache License 2.0](LICENSE)
