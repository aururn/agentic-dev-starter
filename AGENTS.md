# AGENTS.md

この repository は Relay の skill pack である．配るものは `skills/` にあり，導入先の repository に置く file は
`skills/relay-adopt/assets/` にある．設計は [docs/concept.md](docs/concept.md)，判断は [docs/decisions/](docs/decisions/README.md) にある．

## この repository を変えるときの規則

- 文書，skill，comment は日本語で書き，句読点は「．，」を使う．非母語話者にも読みやすい，短く平易な文にする．
- skill には repository 固有の値を書かない．違いは `relay.yml` の項目として `relay-core/references/profile.md` に足す．
- skill の間の参照は `../relay-core/...` の相対 link にする．導入先では skill が同じ directory に並ぶため．
- `.github/` の template，workflow，script は `skills/relay-adopt/assets/github/` の copy である．配る方を編集してから copy する．
- 既存の skill の手順を変えるときは，その変更が既に導入した repository でどう動くかを PR の「見てほしいところ」に書く．
- 他の repository の文書や skill の本文をコピーしない．参考にした場合は考え方だけを使い，自分の言葉で書く．

## 検査

```bash
node scripts/validate.mjs
node --test "tests/**/*.test.mjs"
```

<!-- relay:start -->
## Issue と PR の運用（Relay）

作業は GitHub Issue を単位に進め，状態は GitHub 上に残す．運用の値は [`.agents/relay.yml`](.agents/relay.yml) にある．

| やりたいこと                     | skill           | Codex                | Claude Code          |
| -------------------------------- | --------------- | -------------------- | -------------------- |
| 依頼を Issue に分ける            | `relay-plan`    | `$relay-plan`        | `/relay-plan`        |
| Issue を実装して Draft PR を出す | `relay-build`   | `$relay-build 12`    | `/relay-build 12`    |
| PR を別の目でレビューする        | `relay-review`  | `$relay-review 34`   | `/relay-review 34`   |
| merge して後片付けをする         | `relay-land`    | `$relay-land 34`     | `/relay-land 34`     |
| 中断，再開，交代                 | `relay-handoff` | `$relay-handoff`     | `/relay-handoff`     |

- 1 つの Issue を 1 つの branch と 1 つの Draft PR で完了させる．PR は `Closes #<番号>` で Issue を 1 件だけ閉じる．
- Issue ごとに 1 つのバトン comment（`<!-- relay:baton -->`）を上書きして，今の状態と次の一手を残す．
- PR の「確かめたこと」には，今の head で実際に実行した結果だけを書く．
- Draft 解除，merge，force push，`checks.gated` の検査は，利用者が明示して依頼した場合だけ行う．
<!-- relay:end -->
