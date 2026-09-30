---
title: テスト方針
status: accepted
---

<!-- Derived from docs/architecture/issue-pr-authoring.md in Enterprise Agentic SaaS Starter (https://github.com/ReoHakase/enterprise-agentic-saas-starter), Copyright 2026 Reo Hakuta, Apache-2.0. Modified by aururn: translated, restructured, and changed. -->

# テスト方針

この文書は技術スタックに依存しない最小の方針である．スタックを決めたら，層ごとの具体的な command と
配置をこの文書に追記する．

## テスト層

| 層  | 名前        | 所有するもの                                           | 例                               |
| --- | ----------- | ------------------------------------------------------ | -------------------------------- |
| U   | unit        | 分岐，変換，計算など，外部に依存しない規則             | 関数，class，pure な component   |
| I   | integration | DB，HTTP，file など実際の境界を通る規則，認可          | API handler と test 用 DB        |
| E   | end-to-end  | 利用者の代表的な journey，層をまたぐ配線               | browser を使った代表 1 経路      |
| M   | manual      | 自動化の費用が見合わない確認                           | 見た目の確認，外部サービスの確認 |

## 原則

- 各規則に **最低十分な層を 1 つ** 割り当てる．同じ規則を複数の層で重ねて検査しない．
- 上位の層には，下位の層では検出できない配線だけを代表 case として残す．
- テスト名は要求振る舞いと対応させる．Given-When-Then の `Then` を名前の中心にする．
- ライブラリそのものの動作は検査しない．このリポジトリが選んだ設定と使い方だけを検査する．
- 有料の API や外部サービスを使うテストは，利用者の明示の承認なしに実行しない．

## 自動テストを追加しない場合

次を PR の「テスト」に書く．「薄い変更」「既存テストで十分」だけでは理由にならない．

- 変更が分岐，変換，認可，data の安全性を所有しないこと．
- 型検査，静的検査，既存のテストのどれが同じリスクを検出するか．

## command

| command                 | 内容                                         |
| ----------------------- | -------------------------------------------- |
| `bash scripts/check.sh` | CI と同じ必須検査．スタック導入時に中身を書く |
