# Agent Instructions

この文書は Codex，Claude Code など全ての coding agent に共通する契約である．
agent 向け文書と skill は日本語で書き，句読点は「．，」を使う．文書の入口は [`docs/README.md`](docs/README.md) とする．

## 正本と routing

| 情報                      | 正本                                                                         |
| ------------------------- | ---------------------------------------------------------------------------- |
| 全 agent 共通の契約       | この `AGENTS.md`                                                             |
| 作業の流れと安全境界      | [`docs/architecture/coding-agent-workflow.md`](docs/architecture/coding-agent-workflow.md) |
| Issue と PR の書き方      | [`docs/architecture/issue-pr-authoring.md`](docs/architecture/issue-pr-authoring.md)       |
| レビューの観点            | [`docs/architecture/review-checklist.md`](docs/architecture/review-checklist.md)           |
| テスト方針                | [`docs/testing-strategy.md`](docs/testing-strategy.md)                       |
| 永続的な判断              | `docs/decisions/`（ADR）                                                     |
| 複数 PR にまたがる作業状態 | `docs/exec-plans/active/`                                                    |
| 手順（skill）             | `.agents/skills/`（`.claude/skills/` は同期で生成するコピー）                |

- 仕様や理由を skill へ複製しない．skill は手順，必読文書，検証 command だけを持つ．
- 次回も必要な判断は docs または ADR へ反映する．手順や検証が変わる場合だけ skill も更新する．
- skill は `.agents/skills/` だけを編集し，`scripts/sync-skills.sh` で `.claude/skills/` へ反映する．
- root 以外に `AGENTS.md` を追加しない．

## 作業の流れ

| 段階               | skill             | Codex                  | Claude Code               | 成果物                         |
| ------------------ | ----------------- | ---------------------- | ------------------------- | ------------------------------ |
| 依頼を分解する     | `plan-issues`     | `$plan-issues`         | `/plan-issues`            | epic，sub-issue，依存関係      |
| Issue を実装する   | `implement-issue` | `$implement-issue 12`  | `/implement-issue 12`     | linked branch，commit，Draft PR |
| 差分をレビューする | `review-pr`       | `$review-pr 34`        | `/review-pr 34`           | 指摘の一覧，修正，再レビュー   |
| merge する         | なし              | 利用者                 | 利用者                    | main への反映，Issue の close   |

## 作業手順

1. 対象 Issue，関連する active exec plan，変更領域の docs を読む．
2. 不変条件，必要なテスト層，非スコープを変更前に決める．
3. 既存の変更を保持し，Issue の範囲だけを実装する．範囲外の問題は新しい Issue にする．
4. 採用済みの言語，framework，CLI の標準機能を先に検討し，同等の独自 wrapper や script を増やさない．
5. 最小の決定的な検査から始め，`scripts/check.sh` まで広げる．
6. 現在の差分を `docs/architecture/review-checklist.md` の観点でレビューする．
   可能な場合は実装とは別の context（別 session または subagent）でレビューする．
7. 指摘を修正して検証とレビューを繰り返し，P0/P1 の指摘または必須検査の失敗を残さない．

## GitHub への提出

- 利用者が Issue 単位の実装，修正，継続を依頼した場合，対応する branch への push，Draft PR の作成・更新，
  現在の head に対する CI の確認までを通常工程に含め，操作ごとの承認を求めない．
- 説明，診断，レビューのみ，ローカル限定，commit のみ，push 禁止など，利用者が指定した狭い範囲を優先する．
- 1 つの PR は対応する Issue を `Closes #<番号>` で正確に 1 件だけ閉じる．epic は PR で閉じない．
- 提出前に Issue の Assignee，linked branch，open PR を再取得する．別担当，別実装，未解決の依存があれば停止する．
- commit message と PR title は Conventional Commits に従う．

## 禁止事項

- 明示の承認なしに PR の Draft 解除，レビュー依頼，merge，本番配備，外部サービスの破壊的変更，有料の検査を実行しない．
- 明示の承認なしに force push で remote の履歴を書き換えない．
- generated file と lockfile を所有する command 以外で手編集しない．`.claude/skills/` も手編集しない．
- secret，token，private URL，個人情報を commit，Issue，PR，log へ含めない．
- 確認結果に，実際に実行していない command や推測した成功結果を書かない．
