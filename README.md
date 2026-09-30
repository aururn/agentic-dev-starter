# Relay

[![CI](https://github.com/aururn/agentic-dev-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/aururn/agentic-dev-starter/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/aururn/agentic-dev-starter)](LICENSE)

**Relay** は，Issue を単位に，人と coding agent（Codex / Claude Code）が GitHub 上で作業を引き継ぐための skill pack です．

依頼を sub-issue に分け，Issue ごとに実装，Draft PR，別の agent によるレビュー，merge の後片付けまでを agent が進めます．
人が判断するのは，分解案の承認と merge の依頼の 2 か所だけです．

## 使い始める

repository の root で skill を入れます（Node.js が必要です）．

```bash
npx skills add aururn/agentic-dev-starter --skill '*' -a codex -a claude-code
```

あとは agent に頼むだけです．Codex では `/` の代わりに `$` を使います．

```text
/relay-adopt                                   # この repository に導入する
/relay-plan 招待メールを再送できるようにしたい    # 依頼を sub-issue に分ける
/relay-build 12                                # Issue を実装して Draft PR を出す
/relay-land 34                                 # merge して後片付けをする
```

## Highlights

- **状態は GitHub に残る．** Issue ごとのバトン comment から，どの session，どの agent でも続きを始められます．
- **1 Issue = 1 PR．** 1 回のレビューで読める大きさに分け，触る file が重ならない Issue は並列に進めます．
- **レビューも PR の上で．** `@codex review` の指摘と対応が，全て PR に残ります．
- **古い結果では merge しない．** PR に書いた確認結果の commit を，CI が今の head と照らします．
- **どの repository にも同じ skill．** 違いは `.agents/relay.yml` の設定 1 つにまとめます．

## Documentation

- [設定の全項目](skills/relay-core/references/profile.md)
- [Issue と PR の書式](skills/relay-core/references/formats.md)
- [バトン](skills/relay-core/references/baton.md)
- [承認が必要な操作と共通の規則](skills/relay-core/SKILL.md)
- [設計](docs/concept.md)と[判断の記録](docs/decisions/README.md)

## License

[Apache License 2.0](LICENSE) で公開しています．
