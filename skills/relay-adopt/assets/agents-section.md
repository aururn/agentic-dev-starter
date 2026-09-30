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
