<!-- relay:start -->
@AGENTS.md

## Relay（Claude Code 固有）

- `relay.yml` の `review.independent` が `auto` か `subagent` の場合，独立レビューに `relay-reviewer` subagent
  （`.claude/agents/relay-reviewer.md`）を使える．`codex` が使える場合は `auto` が `codex review` を優先する．
- `.claude/settings.json` で `gh pr merge` と `gh pr ready` を `ask` にしておくと，承認が必要な操作の前に必ず確認が入る．
<!-- relay:end -->
