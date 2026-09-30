# ADR-004 skill を skills CLI で配る

状態：採用（2026-09-30）

## 背景

最初の版は GitHub の template repository として作ったが，既存の repository には導入できなかった．
また，Codex は `.agents/skills/`，Claude Code は `.claude/skills/` を読むため，両方に同じ skill を置く仕組みが必要だった．

## 判断

- この repository を skill pack にし，`skills/` に全ての skill を置く．
- 導入先では `npx skills add aururn/agentic-dev-starter` で skill を入れる．
- template，CI，`relay.yml` など repository 固有の file は，`relay-adopt` が `assets/` から置く．

## 理由

- `skills` CLI が，両方の agent の置き場所への配置と，`skills-lock.json` による版の記録を行う．独自の同期 script が要らない．
- `npx skills update` で，全ての repository に同じ更新を取り込める．
- 既存の repository でも，新しい repository でも，同じ手順で導入できる．

## 他の案

- template repository：新しい repository にしか使えず，後から更新を取り込めない．
- 独自の install script：CLI と同じ機能を保守する必要がある．
- git submodule：Windows と agent の sandbox で扱いにくい．

## 結果

`skills` CLI（Node.js）が必要になる．導入先が Node.js を使わない repository でも，導入する人の手元には Node.js が要る．
