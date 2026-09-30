# docs

| 文書                                                                  | 内容                                             |
| --------------------------------------------------------------------- | ------------------------------------------------ |
| [architecture/coding-agent-workflow.md](architecture/coding-agent-workflow.md) | 依頼から merge までの流れ，client ごとの配置，安全境界 |
| [architecture/issue-pr-authoring.md](architecture/issue-pr-authoring.md)       | Issue と PR の書き方                             |
| [architecture/review-checklist.md](architecture/review-checklist.md)           | レビューの観点と指摘の書き方                     |
| [testing-strategy.md](testing-strategy.md)                            | テスト層と原則                                   |
| [decisions/](decisions/README.md)                                     | ADR（永続的な判断）                              |
| [exec-plans/](exec-plans/README.md)                                   | 複数 PR にまたがる作業の計画と進捗               |

## 更新の規則

- 次回以降も必要な判断は ADR に書く．作業中の判断は exec plan または PR に書く．
- 仕様や理由は docs に書き，skill には複製しない．
