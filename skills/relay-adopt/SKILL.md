---
name: relay-adopt
description: 既存または新規の repository に Relay の運用を導入する．repository を調べて運用設定 .agents/relay.yml の案を作り，承認後に AGENTS.md の節，Issue と PR の template，PR 本文の検査，label を足す．既存の file は上書きしない．「Relay を入れて」「この repo で Issue 駆動にしたい」「運用設定を作って」と依頼されたときに使う．
---

# relay-adopt

## 先に読む

- [../relay-core/SKILL.md](../relay-core/SKILL.md)，[profile.md](../relay-core/references/profile.md)，[formats.md](../relay-core/references/formats.md)

## remote がない場合

`git remote -v` が空，または `gh repo view` が失敗する場合は，GitHub を使わずに進める．

- 調査は local の git だけで行う（手順 1 の表の「local」の列）．
- GitHub への書き込み（Issue，label，push，PR）はしない．実行する予定の command を報告に並べる．
- 手順 3 から 7 の各所に，remote がない場合の扱いを書いた．

## 手順

1. **repository を調べる**．書き込みはしない．

   | 調べること              | GitHub                                                                         | local                                                       |
   | ----------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
   | default branch と統合先 | `gh repo view --json defaultBranchRef`，merge 済み PR の base の分布           | `git branch -a`，`git symbolic-ref refs/remotes/origin/HEAD` |
   | branch 名の形           | `gh pr list --state merged --limit 50 --json headRefName,baseRefName`          | `git log --merges --format=%s -n 50` の branch 名，`git branch -a` |
   | commit と PR title の形 | merge 済み PR の title                                                         | `git log --no-merges --format=%s -n 50`                      |
   | merge の方法            | `gh repo view --json mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed` | `git log --first-parent --format='%P %s' -n 50 <base>`       |
   | 言語                    | 最近の Issue と PR の title と本文                                             | `AGENTS.md`，`README*`，`CONTRIBUTING*`，commit message       |
   | 検査の command          | `.github/workflows/*`                                                          | `package.json` などの scripts，Makefile，`AGENTS.md`，`CONTRIBUTING.md` |
   | 有料や外部の検査        |                                                                                | 名前や説明に `e2e`，`live`，`paid`，`eval`，`deploy` を含む command |
   | 既存の運用              | label，Projects                                                                | `AGENTS.md`，`CLAUDE.md`，`.github/ISSUE_TEMPLATE/`，PR template，`.gitattributes` |
   | Claude Code を使うか    |                                                                                | `CLAUDE.md`，`.claude/` があるか                              |
   | 他の Issue 運用 skill   |                                                                                | `.agents/skills/`，`.claude/skills/` にある Issue や PR を扱う skill |
   | skill 本体の入れ方      |                                                                                | `skills-lock.json` の `source` と `sourceType`，`git status` で skill が追跡済みか |

   - 他の Issue 運用 skill には，Relay 自身の skill（`relay-*`）を含めない．
   - `.agents/relay.yml` があるか，`AGENTS.md`，`CLAUDE.md`，`.gitattributes` に `relay:start` の marker があれば，再導入として扱う．

2. **案を作る**．次の 3 つを利用者に見せ，承認をもらう．
   - `relay.yml` の案．各値に，どこから推定したかを 1 行で添える．推定できない値は既定値にし，
     「推定できなかった（sample 1 件）」のように理由と一緒に書く．推定の規則は下の「推定の規則」に従う．
   - file ごとの扱いの表．扱いは `追加`，`追記`，`提案だけ`，`しない` のどれかにする．
     既存の動作を変える file は，理由の列にそう書く（下の「既存の動作を変える file」）．

     | file | 扱い | 理由 |
     | ---- | ---- | ---- |

   - 確かめたいこと．少なくとも次を聞く．
     - `checks.gated` の候補を gated にするか，`full` に入れるか，外すか
     - 既存の動作を変える file を置くか
     - skill 本体を commit するか（下の「skill 本体の扱い」）
     - Claude Code を使うか（手順 1 で判断できなかった場合）
     - Issue や PR を扱う別の skill がある場合，どちらを使うか．両方が同時に動かないようにする．
     - `language` が `en` になる場合や，`AGENTS.md` が英語で書かれている場合，日本語の節と template を入れてよいか．
       英語の asset はまだない．入れない場合は，`AGENTS.md`，`CLAUDE.md`，template を `提案だけ` にする．

   既存の template や運用の文書がある場合は `提案だけ` にし，置き換えずに違いを説明する．
3. **導入の Issue と branch を作る**．承認後，Relay 自身の書式で「Relay の運用を導入する」Issue を作り，`relay-build` と
   同じ規則で branch を作る．
   - Issue を作れない場合（remote がない，権限がない）は，Issue を作らない．branch 名は `relay.yml` の `branch` から
     `{number}` を含む部分を除いた形にする（例：`{type}/{number}-{slug}` なら `chore/adopt-relay`）．番号を仮の値で埋めない．
4. **file を置く**．`assets/` から次を置く．置く前に，同じ path に file があるかを確かめる．
   同じ内容の file があれば `しない`，違う内容の file があれば `提案だけ` にする（再導入の場合も同じ）．

   | 置く場所                                   | 元                                              | 扱い                                           |
   | ------------------------------------------ | ----------------------------------------------- | ---------------------------------------------- |
   | `.agents/relay.yml`                        | 手順 2 で承認された案                           | 追加                                           |
   | `AGENTS.md`                                | `assets/agents-section.md`                      | 追記．file がなければ追加                      |
   | `CLAUDE.md`                                | `assets/claude-section.md`                      | 追記．file がなければ追加（Claude Code を使う場合） |
   | `.github/ISSUE_TEMPLATE/*.yml`             | `assets/github/ISSUE_TEMPLATE/`                 | 追加．既存があれば提案だけ．`config.yml` は承認した場合だけ |
   | `.github/pull_request_template.md`         | `assets/github/pull_request_template.md`        | 追加．既存があれば提案だけ                     |
   | `.github/workflows/relay-pr-policy.yml`    | `assets/github/workflows/relay-pr-policy.yml`   | 追加                                           |
   | `.github/scripts/relay-pr-policy.mjs`      | `assets/github/scripts/relay-pr-policy.mjs`     | 追加                                           |
   | `.claude/agents/relay-reviewer.md`         | `assets/claude/agents/relay-reviewer.md`        | 追加（Claude Code を使う場合）                 |
   | `.gitattributes`                           | `assets/gitattributes`                          | 追記．file がなければ追加（skill 本体を commit する場合） |

   `AGENTS.md`，`CLAUDE.md`，`.gitattributes` への追記は `relay:start` と `relay:end` の marker の間に置く．
   既にこの marker があれば，その間だけを新しい内容に置き換える．marker の外は変えない．
   `CLAUDE.md` では，**marker の外** に `@AGENTS.md` の行があるかを見る．ない場合は，追記の中の `@AGENTS.md` の行を残す．
   ある場合は，追記の中の行を消す．marker の中にある `@AGENTS.md` は，判断に使わない．
5. **label を作る**．repository の root で，`bash <この skill の path>/assets/setup-labels.sh` を実行する．
   - script は `.agents/relay.yml` の `labels` に従い，ない label だけを作る．既にある label の色と説明は変えない．
     `relay.yml` で既存の label に対応づけた種別と大きさは，その label があれば作らない．
   - 既にある Relay の label の色と説明を直したい場合だけ，利用者の承認を得て `--update` を付ける．
   - remote がない場合は `--dry-run` を付け，表示された予定の command を報告に書く．
   - `$'\r': command not found` で失敗した場合は，script が CRLF になっている．
     `bash <(tr -d '\r' < <この skill の path>/assets/setup-labels.sh)` で実行し，`.gitattributes` の追記を勧める．
6. **確かめる**．
   - `relay.yml` を YAML として読めること．repository に既にある道具を使う（例：`node_modules` の `yaml` か `js-yaml`，
     `python3 -c "import yaml"`，`ruby -ryaml`）．どれもなければ新しく install せず，
     `setup-labels.sh --dry-run` で `labels` を読めることだけを確かめ，YAML の検査は ⏭ にして理由を書く．
   - `checks.full` の command を実行して結果を控える．失敗した場合は，導入のせいか元からかを区別して報告する．
   - `gh label list` に `relay:*` の label があること．remote がない場合は ⏭ にする．
7. **PR を出す**．`relay-build` の手順 11 から 14（commit と push，Draft PR，CI を待つ，状態の更新）と同じにする．
   報告は，relay-build の手順 16 ではなく，この skill の手順 8 で行う．
   - `relay-pr-policy` は，この PR 自身も検査する．Issue を作れなかった場合は `Closes` の行を書けないので，PR を作らない．
   - remote がない場合は commit までにし，`git push` と `gh pr create` を予定の command として報告に書く．
   - skill 本体を commit する場合は，導入の file とは別の commit にする．
8. **報告する**．導入した file，承認が必要な残りの設定（branch protection の required check に `relay-pr-policy` を
   足すこと，Projects の権限など），実行しなかった予定の command，最初に試す依頼文の例を示す．

## 推定の規則

- **sample の数**：branch 名，commit，PR title，merge の方法は，sample が 3 件以上あり，その過半数が同じ形の場合だけ採用する．
  そうでなければ既定値にし，「推定できなかった（sample n 件）」と書く．
- **`base`**：default branch．merge 済み PR の過半数が別の branch を base にしている場合は，その branch を案にする．
- **`branch`**：sample の branch 名を `{type}`，`{number}`，`{slug}`，`{agent}` の組み合わせで表せる場合だけ採用する．
- **`commit` と `pr_title`**：過半数が `type(scope): subject` の形なら `conventional`，そうでなければ `free` と `plain`．
- **`merge.method`**：GitHub で許可された方法が 1 つだけなら，それにする．複数ある場合は，`base` の first-parent の履歴で決める．
  親が 2 つの commit（`Merge pull request #...`）が過半数なら `merge`，subject が `(#123)` で終わる commit が過半数なら
  `squash`．どちらでもなければ既定値にする．
- **`language`**：Issue，PR，commit，AGENTS.md の本文で，過半数が日本語なら `ja`，英語なら `en`．
  sample がない場合は，利用者と話している言語にし，そう書く．
- **`checks.full`**：CI が PR で実行する command を，手元で実行できる形にしたもの．CI がない場合は，AGENTS.md や
  CONTRIBUTING.md が push の前に実行するよう書いている command．どちらもなければ `[]` にする．
- **`checks.fast`**：`full` の中から，lint，format の検査，型検査のように，test と build を含まない command を選ぶ．
  該当がなければ `[]` にする．`full` にない command を足さない．
- **`checks.gated`**：名前や説明に `e2e`，`live`，`paid`，`eval`，`deploy` を含む command は，CI で実行されていても
  gated の候補にする．手順 2 で利用者に確かめ，承認されたものだけを残す．
- **`review.independent`**：`auto` にする．
- **Claude Code を使うか**：`CLAUDE.md` か `.claude/`（`npx skills add -a claude-code` で入れた `.claude/skills/` を含む）があれば使うとする．どちらもなければ手順 2 で聞く．

## 既存の動作を変える file

次の file は，置くだけで repository の動作が変わる．手順 2 の表で理由を書き，承認を得た場合だけ置く．

| file                                    | 変わること                                               |
| --------------------------------------- | -------------------------------------------------------- |
| `.github/ISSUE_TEMPLATE/config.yml`     | template を使わない空の Issue を作れなくなる             |
| `.github/workflows/relay-pr-policy.yml` | Relay の書式でない PR（`Closes` がないなど）の CI が失敗する |

## skill 本体の扱い

`npx skills add` は，skill 本体を `.agents/skills/` と `.claude/skills/` に置き，`skills-lock.json` に版を記録する．

- `skills-lock.json` の `sourceType` が `local` の場合（手元の path から入れた場合）は，commit しない．他の人の環境では
  source の path がないためである．報告に，GitHub から入れ直す command（README の「入れる」）を書く．
- それ以外の場合は，commit するかを手順 2 で利用者に決めてもらう．既定は commit する．clone した人と CI が同じ版の skill を
  使えるためである．commit する場合は `.agents/skills/relay-*`，`.claude/skills/relay-*`，`skills-lock.json` を入れ，
  `.gitattributes` の追記も置く．Windows で CRLF に変換されると，`setup-labels.sh` が動かなくなるためである．
- commit しない場合は，`.gitignore` に足すかを利用者に確かめる．承認なしに `.gitignore` を変えない．

## してはいけないこと

- 既存の template，文書，CI を承認なしに上書きすること．
- 推定できない値（検査の command など）を，それらしい値で埋めること．Issue の番号を仮の値で埋めること．
- branch protection や repository の設定を，承認なしに変えること．
- 既にある label の色と説明を，承認なしに変えること．
