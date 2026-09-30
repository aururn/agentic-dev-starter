---
id: ADR-001
title: Issue 駆動の agent 開発フロー
status: accepted
date: 2026-09-30
---

# ADR-001 Issue 駆動の agent 開発フロー

## 背景

coding agent に大きな依頼をまとめて渡すと，差分が大きくなってレビューできず，途中の判断も残らない．
また agent が自分で書いた結果を自分で確認すると，未実行の検査を成功と報告するなどの誤りが起きる．

## 決定

- 依頼を epic と sub-issue に分解し，1 Issue = 1 PR = 1 レビュー単位で進める．
- Issue は実装前の契約，PR は実装後の結果の契約とし，要求振る舞いを Given-When-Then で書く．
- agent は Draft PR と CI の確認までを行い，Draft 解除と merge は利用者が行う．
- PR の確認結果には，現在の head で実際に実行した結果だけを書く．
- レビューは実装とは別の context で行う．

## 理由

- 小さい PR はレビューの負担が小さく，問題があっても 1 件ずつ戻せる．
- Issue と PR に判断を残すと，次の agent session が同じ前提から始められる．
- merge を利用者の判断に残すことで，agent の誤りが main に入る前に止められる．

## 検討した代替案

- 依頼ごとに 1 つの大きな PR を作る：レビューと切り戻しが難しい．
- agent に merge まで任せる：誤りが main に入ったときの影響が大きい．
- 作業状態を local の file だけで管理する：他の人や別の agent から見えない．

## 結果

Issue と PR の作成に時間がかかる．その代わり，作業の履歴と判断が GitHub 上に残る．

## 強制方法

- `AGENTS.md` の禁止事項と，`.claude/settings.json` の `deny`．
- CI の `pr-policy` job（`Closes` が 1 件だけであること）．
- `review-pr` skill と `docs/architecture/review-checklist.md`．
