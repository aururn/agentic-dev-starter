<div align="center">

# Relay

**Issue を単位に，人と coding agent が GitHub 上で作業を引き継ぐ skill pack**

[![CI](https://github.com/aururn/agentic-dev-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/aururn/agentic-dev-starter/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/aururn/agentic-dev-starter)](LICENSE)
![Codex](https://img.shields.io/badge/Codex-supported-111111)
![Claude Code](https://img.shields.io/badge/Claude_Code-supported-D97757)

</div>

依頼を Issue に分け，Issue ごとに実装，Draft PR，別の agent によるレビュー，merge の後片付けまでを進めます．
作業の状態は会話ではなく GitHub に残るので，session が替わっても，Codex から Claude Code に替わっても，同じところから続けられます．

| 1. 分ける | 2. 作る | 3. 確かめる | 4. 入れる |
| :-: | :-: | :-: | :-: |
| `relay-plan` | `relay-build` | `relay-review` | `relay-land` |
| 依頼を epic と sub-issue に分ける | 1 Issue を実装して Draft PR を出す | 別の agent が PR 上でレビューする | merge して Issue と branch を片付ける |
| **👤 分解案を承認** | | | **👤 merge を依頼** |

人が判断するのは 👤 の 2 か所だけです．途中で止めるとき，再開するとき，担当を替えるときは `relay-handoff` を使います．

## ⚡ 使い始める

```bash
# 1. repository の root で skill を入れる（Codex と Claude Code の両方に入る）
npx skills add aururn/agentic-dev-starter --skill '*' -a codex -a claude-code
```

2. agent に `$relay-adopt`（Codex）または `/relay-adopt`（Claude Code）と頼み，出てきた運用設定の案を承認する．
3. 作りたいものを `/relay-plan 〇〇を作りたい` と頼む．あとは Issue ごとに `/relay-build 12` を実行する．

既存の repository にも入れられます．`relay-adopt` は既存の file を上書きせず，違いがあれば提案だけにします．
更新は `npx skills update` で取り込めます．

## 🧩 3 つの仕組み

<table>
<tr>
<td width="33%" valign="top">

### 🤝 バトン

Issue ごとに 1 つの comment を上書きし，状態，担当，branch，PR，次の一手を置きます．
次の session はこれを読むだけで再開できます．

</td>
<td width="33%" valign="top">

### ⚙️ 運用設定

base branch，branch 名，PR title，検査の command，レビューの方法は `.agents/relay.yml` に書きます．
skill はどの repository でも同じです．

</td>
<td width="33%" valign="top">

### ✅ 確かめた証拠

PR には，結果を得た commit（`確認した head:`）と結果を書きます．
CI が今の head と照らし，古い結果のままの merge を止めます．

</td>
</tr>
</table>

## 📝 Issue と PR の書き方

Issue の要求は，文章ではなく **例の表** で書きます．境界と例外が見やすく，そのまま test の case になります．

| 状況 | 入力・操作 | 期待する結果 |
| --- | --- | --- |
| 管理者，招待は期限切れ | 再送する | 新しい招待を 1 件作り，古い招待を無効にする |
| 管理者，招待は有効 | 再送する | 再送せず，「まだ有効です」と返す |
| 管理者でない member | 再送する | 権限エラーを返す |

PR は **変わること，見てほしいところ，Issue からの変更，確かめたこと，戻し方** の 5 節だけです．
詳しい規則は [formats.md](skills/relay-core/references/formats.md) にあります．

## ⌨️ コマンド

| やりたいこと | Codex | Claude Code |
| --- | --- | --- |
| 導入する | `$relay-adopt` | `/relay-adopt` |
| 依頼を Issue に分ける | `$relay-plan 〇〇を作りたい` | `/relay-plan 〇〇を作りたい` |
| Issue を実装して Draft PR を出す | `$relay-build 12` | `/relay-build 12` |
| PR をレビューする | `$relay-review 34` | `/relay-review 34` |
| merge して後片付けをする | `$relay-land 34` | `/relay-land 34` |
| 中断，再開，交代 | `$relay-handoff` | `/relay-handoff` |

## 📚 詳しく

<details>
<summary><b>運用設定の例</b>（<code>.agents/relay.yml</code>）</summary>

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

全ての項目と既定値は [profile.md](skills/relay-core/references/profile.md) にあります．

</details>

<details>
<summary><b>CI の検査</b>（<code>relay-pr-policy</code>）</summary>

| 検査 | Draft の間 | Draft 解除後 |
| --- | --- | --- |
| 閉じる Issue（`Closes #N`）が 1 件だけか | 失敗 | 失敗 |
| `確認した head:` が今の head と一致するか | 警告 | 失敗 |
| 「確かめたこと」に ❌ が残っていないか | 警告 | 失敗 |

branch protection の required check に `relay-pr-policy` を足すと，古い検査結果のまま merge されるのを防げます．

</details>

<details>
<summary><b>agent が承認なしにしないこと</b></summary>

次の操作は，利用者が明示して依頼した場合だけ行います．

- PR の Draft 解除，merge，人へのレビュー依頼，approve
- force push，公開済みの履歴の書き換え
- `checks.gated` の検査（有料の API，外部サービス，本番環境）
- 本番配備，外部サービスの設定変更，secret の変更

branch の作成，commit，作業 branch への push，Draft PR，`@codex review` とレビューの結果の comment，label，バトンの更新は，
Issue 単位の依頼に含まれるものとして進めます．

</details>

<details>
<summary><b>repository の構成</b></summary>

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

設計の考え方は [docs/concept.md](docs/concept.md)，判断の記録は [docs/decisions/](docs/decisions/README.md) にあります．

</details>

## 🙏 参考にしたもの

Issue を実装前の約束，PR を実装後の記録として分ける考え方は，
[ReoHakase/enterprise-agentic-saas-starter](https://github.com/ReoHakase/enterprise-agentic-saas-starter) の運用を参考にしました．
文書と skill の本文，書式，仕組みはこの repository で独自に書いたものです．

## 📄 License

[Apache License 2.0](LICENSE)
