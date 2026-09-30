# exec plan

複数の PR や session にまたがる作業の計画，進捗，判断を記録する．1 つの Issue で完結する作業では作らない．

## 状態

| 状態        | 置き場所      | 意味                           |
| ----------- | ------------- | ------------------------------ |
| `active`    | `active/`     | 実行中                         |
| `completed` | `completed/`  | 完了の定義を満たした           |
| `abandoned` | `completed/`  | 理由を残して中止した           |

## 運用

1. epic の作成時に [`template.md`](template.md) をコピーし，`active/PLAN-YYYY-NNN-<slug>.md` を作る．
2. PR が merge されるたびに「進捗」と「判断記録」を更新する．更新は該当する PR に含める．
3. 完了したら `completed/` へ移す．後の作業でも必要な判断は ADR に昇格する．
