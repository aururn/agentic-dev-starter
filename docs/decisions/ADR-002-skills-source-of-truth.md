---
id: ADR-002
title: skill の正本を .agents/skills に置く
status: accepted
date: 2026-09-30
---

# ADR-002 skill の正本を .agents/skills に置く

## 背景

Codex は `AGENTS.md` と `.agents/skills/` を読み，Claude Code は `CLAUDE.md` と `.claude/skills/` を読む．
両方に別々の skill を書くと，内容が少しずつずれる．

## 決定

- 共通の契約は `AGENTS.md` に書き，`CLAUDE.md` は `@AGENTS.md` で読み込む．
- skill の正本は `.agents/skills/` に置き，`.claude/skills/` は `scripts/sync-skills.sh` で生成するコピーとする．
- `.claude/skills/` は clone 直後から使えるように Git で管理する．
- SKILL.md の frontmatter は両方の client が解釈できる `name` と `description` だけにする．

## 理由

- 正本が 1 つなので，片方だけ更新する誤りが起きない．
- symlink は Windows で扱いにくいため，コピーを採用する．

## 検討した代替案

- symlink：Windows の Git では既定で通常の file になり，動かない場合がある．
- `.claude/skills/` を Git で管理せず，setup 時に生成する：clone 直後に使えない．

## 結果

skill を変えたときに同期の command を忘れる可能性がある．

## 強制方法

- CI の `skills-sync` job が，同期後に差分が出ないことを検査する．
