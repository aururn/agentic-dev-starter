---
name: relay-adopt
description: 既存または新規の repository に Relay の運用を導入する．repository を調べて運用設定 .agents/relay.yml の案を作り，承認後に AGENTS.md の節，Issue と PR の template，PR 本文の検査，label を足す．既存の file は上書きしない．「Relay を入れて」「この repo で Issue 駆動にしたい」「運用設定を作って」と依頼されたときに使う．
---

# relay-adopt

## 先に読む

- [../relay-core/SKILL.md](../relay-core/SKILL.md)，[profile.md](../relay-core/references/profile.md)，[formats.md](../relay-core/references/formats.md)

## 手順

1. **repository を調べる**．書き込みはしない．

   | 調べること             | 方法                                                                                          |
   | ---------------------- | --------------------------------------------------------------------------------------------- |
   | default branch と統合先 | `gh repo view --json defaultBranchRef`，`git branch -r`，merge 済み PR の base の分布         |
   | branch 名の形          | `gh pr list --state merged --limit 50 --json headRefName,baseRefName`                         |
   | commit と PR title の形 | `git log --format=%s -n 50`，merge 済み PR の title                                           |
   | 検査の command         | `package.json` などの scripts，Makefile，`.github/workflows/*`，`AGENTS.md`，`CONTRIBUTING.md` |
   | 有料や外部の検査       | 名前や説明に `e2e`，`live`，`paid`，`eval`，`deploy` を含む command                           |
   | 既存の運用             | `AGENTS.md`，`CLAUDE.md`，`.github/ISSUE_TEMPLATE/`，PR template，label，Projects             |
   | 他の Issue 運用 skill  | `.agents/skills/`，`.claude/skills/` にある Issue や PR を扱う skill                          |

2. **案を作る**．次の 2 つを利用者に見せ，承認をもらう．
   - `relay.yml` の案．各値に，どこから推定したかを 1 行で添える．推定できない値は既定値にし，そう書く．
   - file ごとの扱いの表．扱いは `追加`，`追記`，`提案だけ`，`しない` のどれかにする．

     | file | 扱い | 理由 |
     | ---- | ---- | ---- |

   既存の template や運用の文書がある場合は `提案だけ` にし，置き換えずに違いを説明する．
   Issue や PR を扱う別の skill がある場合は，どちらを使うかを利用者に決めてもらい，両方が同時に動かないようにする．
3. **導入の Issue と branch を作る**．承認後，Relay 自身の書式で「Relay の運用を導入する」Issue を作り，`relay-build` と
   同じ規則で branch を作る．
4. **file を置く**．`assets/` から次を置く．置く前に，同じ path に file がないことを確かめる．

   | 置く場所                                   | 元                                              | 扱い                                |
   | ------------------------------------------ | ----------------------------------------------- | ----------------------------------- |
   | `.agents/relay.yml`                        | 手順 2 で承認された案                           | 追加                                |
   | `AGENTS.md`                                | `assets/agents-section.md`                      | 追記．file がなければ追加           |
   | `CLAUDE.md`                                | `assets/claude-section.md`                      | 追記．file がなければ追加           |
   | `.github/ISSUE_TEMPLATE/*.yml`             | `assets/github/ISSUE_TEMPLATE/`                 | 追加．既存があれば提案だけ          |
   | `.github/pull_request_template.md`         | `assets/github/pull_request_template.md`        | 追加．既存があれば提案だけ          |
   | `.github/workflows/relay-pr-policy.yml`    | `assets/github/workflows/relay-pr-policy.yml`   | 追加                                |
   | `.github/scripts/relay-pr-policy.mjs`      | `assets/github/scripts/relay-pr-policy.mjs`     | 追加                                |
   | `.claude/agents/relay-reviewer.md`         | `assets/claude/agents/relay-reviewer.md`        | 追加（Claude Code を使う場合）      |

   `AGENTS.md` と `CLAUDE.md` への追記は `<!-- relay:start -->` と `<!-- relay:end -->` の間に置く．
   既にこの marker があれば，その間だけを新しい内容に置き換える．marker の外は変えない．
   `CLAUDE.md` に `@AGENTS.md` がない場合は，追記の中の `@AGENTS.md` の行を残す．ある場合は消す．
5. **label を作る**．`bash <この skill の path>/assets/setup-labels.sh` を実行する．`relay.yml` の `labels` で既存の label に
   対応づけた種別と大きさは作らない．
6. **確かめる**．
   - `relay.yml` を YAML として読めること（`node -e` や `python -c` など，repository にある道具で確かめる）．
   - `checks.full` の command を実行して結果を控える．失敗した場合は，導入のせいか元からかを区別して報告する．
   - `gh label list` に `relay:*` の label があること．
7. **PR を出す**．`relay-build` の手順 11 以降と同じく，Draft PR を作り，CI を待つ．
   `relay-pr-policy` は，この PR 自身も検査する．
8. **報告する**．導入した file，承認が必要な残りの設定（branch protection の required check に `relay-pr-policy` を
   足すこと，Projects の権限など），最初に試す依頼文の例を示す．

## してはいけないこと

- 既存の template，文書，CI を承認なしに上書きすること．
- 推定できない値（検査の command など）を，それらしい値で埋めること．
- branch protection や repository の設定を，承認なしに変えること．
