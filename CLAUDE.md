# CLAUDE.md

全 agent 共通の契約は `AGENTS.md` を正本とする．ここには Claude Code 固有の内容だけを書く．

@AGENTS.md

## Claude Code 固有

- skill は `.claude/skills/` から読み込まれる．これは `.agents/skills/` のコピーなので，編集は `.agents/skills/` に対して行い，
  `bash scripts/sync-skills.sh` を実行する．
- `review-pr` の独立レビューは read-only の `reviewer` subagent（`.claude/agents/reviewer.md`）へ任せる．
- 危険な操作は `.claude/settings.json` の `deny` で止めている．deny に当たった場合は回避せず利用者に確認する．
