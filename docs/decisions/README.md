# ADR

長期的な設計判断を，理由，代替案，強制方法とともに残す．

## 状態

- `proposed`：提案中
- `accepted`：採用済み．意味を直接書き換えず，新しい ADR で置き換える
- `superseded`：別の ADR で置き換えた

## 作り方

[`template.md`](template.md) をコピーし，`ADR-NNN-<slug>.md` を作る．番号は連番にする．

## 一覧

- [ADR-001 Issue 駆動の agent 開発フロー](ADR-001-issue-driven-agent-workflow.md)
- [ADR-002 skill の正本を .agents/skills に置く](ADR-002-skills-source-of-truth.md)
