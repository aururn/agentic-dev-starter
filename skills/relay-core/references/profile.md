# 運用設定 `.agents/relay.yml`

repository ごとの違いを 1 つの file にまとめる．relay-* skill はこの file を読んで動き，
repository に固有の値を skill の本文へ書かない．雛形は `relay-adopt/assets/relay.yml` にある．

## 項目と既定値

| 項目                 | 既定値                           | 内容                                                                 |
| -------------------- | -------------------------------- | -------------------------------------------------------------------- |
| `version`            | `1`                              | 書式の版                                                             |
| `language`           | `ja`                             | Issue，PR，comment の言語（`ja` または `en`）                        |
| `base`               | repository の default branch     | 作業 branch の起点と，PR の統合先                                    |
| `branch`             | `"{type}/{number}-{slug}"`       | 作業 branch の名前．使える記号は下の表                               |
| `commit`             | `conventional`                   | `conventional`（Conventional Commits）または `free`                  |
| `pr_title`           | `conventional`                   | `conventional` または `plain`（内容が分かる自然な文）                |
| `checks.fast`        | `[]`                             | 実装中に何度も実行する，速い検査                                     |
| `checks.full`        | `[]`                             | push の前に必ず実行する検査．CI と同じにする                         |
| `checks.gated`       | `[]`                             | 利用者の承認が要る検査（有料の API，外部サービス，長時間）           |
| `review.independent` | `auto`                           | 独立レビューの方法．下の「独立レビュー」                             |
| `labels.type`        | `feat: type:feat` など           | 種別と label 名の対応                                                |
| `labels.size`        | `S: size:S` など                 | 大きさと label 名の対応                                              |
| `projects`           | `null`                           | GitHub Projects に登録する場合 `{ owner, number }`                   |
| `stack`              | `false`                          | 依存する Issue の PR を，依存先の branch の上に積むか                |
| `worktree`           | `null`                           | 並列作業の置き場所（例：`"../{repo}-{number}"`）．`null` なら使わない |
| `merge.method`       | `squash`                         | `squash`，`merge`，`rebase` のどれか．release PR は常に `merge` を使う |
| `release`            | `null`                           | 統合 branch から本番 branch への release PR を使う場合 `{ from, to }` |

`stack: true` と `merge.method` の `squash` または `rebase` を組み合わせると，下の PR を merge した後に，上の PR を
新しい base に載せ直す必要がある（履歴の書き換えなので，push に承認が要る）．stack を使う場合は `merge.method: merge` を勧める．

`checks` が全て空の場合，agent は検査を推測せず，`relay-adopt` で設定するよう利用者に伝える．

## branch 名の記号

| 記号       | 値                                                   |
| ---------- | ---------------------------------------------------- |
| `{type}`   | Issue の種別（`feat`，`fix`，`refactor`，`docs`，`chore`，`spike`） |
| `{number}` | Issue の番号                                         |
| `{slug}`   | 内容を表す英小文字と `-` の 2〜5 語（例：`resend-invitation`）      |
| `{agent}`  | 作業している agent（`codex`，`claude`）              |

## 独立レビュー

| 値                         | 動作                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `auto`                     | 実装した agent とは別の agent を優先する．下の順に，使えるものを選ぶ |
| `subagent`                 | Claude Code の `relay-reviewer` subagent                             |
| command の文字列           | その command を実行する．`{base}` は `origin/<base>` に置き換える         |
| `none`                     | 独立レビューをしない．PR の「見てほしいところ」に自己レビューのみと書く |

どの方法でも，対象の PR の head を取り出した作業場所で実行する（`relay-review` の手順 2）．

`auto` の順序：

1. Claude Code で実装した場合：`codex` が使えれば `codex review --base origin/<base>`．
2. Codex で実装した場合：`claude` が使えれば `claude -p` に relay-review の手順を渡す．
3. 別の agent が使えない場合：Claude Code では `relay-reviewer` subagent，Codex では新しい session．
4. どれも使えない場合：自己レビューのみであることを PR に書く．

## 例

統合 branch を `staging` にし，release PR で `main` へ反映するチームの例：

```yaml
version: 1
language: ja
base: staging
branch: "{agent}/{number}-{slug}"
pr_title: plain
checks:
  fast: ["bun run lint"]
  full: ["bun run check", "bun run test"]
  gated: ["bun run test:e2e:paid"]
release: { from: staging, to: main }
projects: { owner: my-team, number: 1 }
```

`main` だけで運用し，検査を細かく分けている repository の例：

```yaml
version: 1
language: ja
base: main
branch: "{type}/issue-{number}-{slug}"
checks:
  fast: ["pnpm lint", "pnpm typecheck"]
  full: ["pnpm lint", "pnpm typecheck", "pnpm test", "pnpm build"]
  gated: ["pnpm test:e2e:live"]
review:
  independent: "codex review --base {base}"
worktree: "../{repo}-{number}"
```
