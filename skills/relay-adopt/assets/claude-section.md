<!-- relay:start -->
@AGENTS.md

## Relay（Claude Code 固有）

- `relay.yml` の `review.independent` が `auto` の場合，独立レビューはまず PR に `@codex review` と comment して
  GitHub 上で受ける．受けられない場合は，手元の `codex review`，次に `relay-reviewer` subagent
  （`.claude/agents/relay-reviewer.md`）を使う．`subagent` の場合は最初から subagent を使う．
- 手元の方法でレビューした場合も，結果と対応を PR に comment する．
- `.claude/settings.json` で `gh pr merge` と `gh pr ready` を `ask` にしておくと，承認が必要な操作の前に必ず確認が入る．
<!-- relay:end -->
