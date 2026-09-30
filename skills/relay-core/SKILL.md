---
name: relay-core
description: Relay（Issue を単位に，人と coding agent が GitHub 上で作業を引き継ぐ運用）の共通規則．relay-plan，relay-build，relay-review，relay-land，relay-handoff，relay-adopt の実行前に読む．運用設定 .agents/relay.yml の読み方，バトン comment，Issue と PR の書式，承認が必要な操作を定める．
---

# relay-core

## Relay の考え方

作業の状態を agent の会話の中ではなく **GitHub 上** に置く．そうすると，Codex，Claude Code，人のどれが次に
作業を始めても，同じ状態から続けられる．

| もの         | 役割                                   | 書式                                           |
| ------------ | -------------------------------------- | ---------------------------------------------- |
| Issue        | これからやることの約束（作業票）       | [references/formats.md](references/formats.md) |
| PR           | やったことと確かめたことの記録（納品） | [references/formats.md](references/formats.md) |
| バトン       | 今の状態と次の一手（引き継ぎ）         | [references/baton.md](references/baton.md)     |
| label        | 種別，大きさ，状態                     | この文書の「label」                            |
| GitHub の関係 | 親子（sub-issue），依存（blocked by）  | [references/github.md](references/github.md)   |

段階と skill：

```text
relay-plan ──▶ relay-build ──▶ relay-review ──▶ relay-land
 依頼を分ける    1 Issue を実装    別の目で検査       merge と後片付け
                     ▲    relay-handoff（中断，再開，交代）はどの段階からでも使う
```

## 運用設定を読む

最初に repository root の `.agents/relay.yml` を読む．書式は [references/profile.md](references/profile.md) にある．

- file がない場合は，profile.md の既定値で動き，報告の最後に `relay-adopt` の実行を勧める．
- file と `AGENTS.md` の記述が食い違う場合は `AGENTS.md` を優先し，食い違いを報告する．
- 設定にない判断が必要になった場合は，推測で決めずに利用者へ確認する．

## label

状態の label は Relay 専用の名前にして，repository の既存の label と衝突させない．
種別と大きさの label は `relay.yml` の `labels` で既存の label に対応づけられる．

| 状態 label      | 意味                                           |
| --------------- | ---------------------------------------------- |
| `relay:ready`   | 着手できる（[着手の条件](references/formats.md#着手の条件)を満たす） |
| `relay:working` | 誰かが実装している                             |
| `relay:blocked` | 依存または確認待ちで止まっている               |
| `relay:review`  | Draft PR があり，レビューまたは merge を待つ   |

1 つの Issue に状態 label は 1 つだけ付ける．付け替えるときは古い方を外す．

## 承認が必要な操作

次の操作は，利用者がその操作を明示して依頼した場合だけ行う．依頼が「Issue #12 を進めて」のような一般的な
ものである場合は，含まれないものとして扱う．

- PR の Draft 解除，merge，人へのレビュー依頼，approve
- force push，公開済みの履歴の書き換え，branch の削除（merge 後の自動削除と，下にある `relay-review-<PR>` を除く）
- `relay.yml` の `checks.gated` にある検査（有料，外部サービス，本番環境）
- 本番配備，外部サービスの設定変更，secret の変更
- 他の人が Assignee になっている Issue での作業

次の操作は，Issue 単位の作業の依頼に含まれるものとして，毎回の確認なしに行ってよい．

- 作業 branch の作成，commit，その branch への push
- Draft PR の作成と本文の更新，CI の再実行
- 独立レビューのための `@codex review` の comment と，レビューの結果と対応の PR への comment
- `relay-review` が作った local の一時 branch `relay-review-<PR>` の削除．ただし，PR の head に含まれない commit がない場合に限る
- 自分が担当する Issue の label，Assignee，バトンの更新

## command の例について

各 skill の command の例にある `$repo` は，`owner/name` の形の repository 名である．最初に次で設定する．

```bash
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
```

## 書くときの共通規則

- Issue，PR，comment の言語は `relay.yml` の `language` に従う．
- 確かめたことには，**今の head で実際に実行した結果だけ** を書く．実行していないものは ⏭ と理由を書く．
- 親子関係，依存，担当は GitHub の機能で表し，本文に同じことを書かない．
- secret，token，個人情報，private URL，顧客名を Issue，PR，comment，commit に書かない．
- GitHub に書き込んだ後は，`gh` で読み直して結果を確認する．途中で失敗した場合は，重複して作らないよう
  既に作られたものを確認してから再実行する．
