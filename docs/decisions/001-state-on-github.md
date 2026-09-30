# ADR-001 作業の状態を GitHub のバトン comment に置く

状態：採用（2026-09-30）

## 背景

Codex と Claude Code を併用し，session も頻繁に替わる．作業の途中の状態が agent の会話や手元の file にしかないと，
次の session が同じ調査をやり直すか，古い前提で作業を始める．

## 判断

- Issue ごとに 1 つのバトン comment を置き，書き足さずに上書きする．
- バトンには，状態，担当，branch，PR，済んだこと，次の一手，止まっている理由，手元だけにあるもの，を書く．
- 状態 label（`relay:*`）をバトンの状態と一致させ，一覧で絞り込めるようにする．
- 経過の記録は commit と PR に任せ，comment を書き足さない．

## 理由

- 上書きなので，最新の状態が常に 1 か所にある．書き足しの comment では，どれが最新かを読み手が判断する必要がある．
- GitHub 上にあるので，どの agent も人も同じ手段（`gh`）で読める．
- 「手元だけにあるもの」を書かせることで，push していない変更の存在を次の担当者に伝えられる．

## 他の案

- repository の file（計画書）に進捗を書く：更新のたびに commit と PR が必要になり，merge されるまで他の branch から見えない．
- comment を書き足す：最新の状態を探す手間がかかり，古い情報と混ざる．
- GitHub Projects の field だけを使う：自由記述の「次の一手」を置きにくく，Projects を使わない repository で使えない．

## 結果

バトンの更新を忘れると，古い状態が残る．relay-build，relay-handoff，relay-land の手順の中で更新する時点を決めて防ぐ．
