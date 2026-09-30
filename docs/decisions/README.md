# 判断の記録（ADR）

後から変えるときに理由が必要になる判断を残す．採用した判断の意味は書き換えず，変えるときは新しい ADR を足して
古い ADR の状態を `置き換え済み` にする．

| ADR | 判断 | 状態 |
| --- | --- | --- |
| [001](001-state-on-github.md) | 作業の状態を GitHub のバトン comment に置く | 採用 |
| [002](002-profile-per-repository.md) | repository ごとの違いを `.agents/relay.yml` に集める | 採用 |
| [003](003-examples-table.md) | 振る舞いを例の表で書く | 採用 |
| [004](004-distribute-with-skills-cli.md) | skill を `skills` CLI で配る | 採用 |
| [005](005-review-on-github.md) | 独立レビューを GitHub の `@codex review` で受ける | 採用 |

書式：背景，判断，理由，他の案，結果，の 5 節．
