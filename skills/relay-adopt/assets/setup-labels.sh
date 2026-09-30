#!/usr/bin/env bash
# Relay の label を作る．repository の root で実行する．
#
#   bash setup-labels.sh [--config <path>] [--dry-run] [--update]
#
# - .agents/relay.yml の labels に従って，種別と大きさの label 名を決める．file がなければ既定の名前を使う．
# - ない label だけを作る．既にある label の色と説明は変えない．
# - --update：既にある label のうち，Relay の既定の名前のもの（relay:* など）だけ，色と説明を Relay の値にする．
#   relay.yml で別の名前に対応づけた label は，--update でも変えない．
# - --dry-run：GitHub に書き込まず，実行する予定の command を表示する．remote がない場合にも使える．
# 必要なもの：bash，awk，gh（--dry-run では gh がなくてもよい）．
set -euo pipefail

config=".agents/relay.yml"
dry_run=false
update=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      config="${2:?--config には path を指定する}"
      shift 2
      ;;
    --dry-run)
      dry_run=true
      shift
      ;;
    --update)
      update=true
      shift
      ;;
    -h | --help)
      awk 'NR > 1 && /^#/ { print; next } NR > 1 { exit }' "$0"
      exit 0
      ;;
    *)
      echo "不明な option：$1" >&2
      exit 2
      ;;
  esac
done

# 名前|色|説明
status_labels=(
  "relay:ready|0E8A16|着手できる"
  "relay:working|FBCA04|実装中"
  "relay:blocked|B60205|依存または確認待ち"
  "relay:review|1D76DB|Draft PR があり，レビューか merge を待つ"
  "relay:release|5319E7|release PR"
)
# relay.yml の key|既定の名前|色|説明
mapped_labels=(
  "type.feat|type:feat|A2EEEF|機能の追加"
  "type.fix|type:fix|D73A4A|不具合の修正"
  "type.refactor|type:refactor|C5DEF5|振る舞いを変えない改善"
  "type.docs|type:docs|0075CA|文書"
  "type.chore|type:chore|EDEDED|設定，依存，CI"
  "type.spike|type:spike|F9D0C4|決めるための調査"
  "type.epic|epic|3E4B9E|複数の Issue に分けて進める大項目"
  "size.S|size:S|C2E0C6|1 つの関心事，差分がおおむね 200 行以下"
  "size.M|size:M|7BC96F|1 回のレビューで読める"
  "size.L|size:L|E99695|分けてから実装する"
)

# relay.yml の labels の block を「group.key<TAB>名前」の行にする．
# block 形式（1 行に 1 つ）だけを読む．flow 形式（{ ... }）と，引用符の中の escape は読めないので止める．
mapping=""
if [[ -f "$config" ]]; then
  if ! mapping=$(awk '
    function fail(s) { print "ERROR\t" s; exit 1 }
    { sub(/\r$/, "") }
    /^[^[:space:]#]/ {
      in_labels = ($0 ~ /^labels:/)
      if (in_labels && $0 !~ /^labels:[[:space:]]*(#.*)?$/) fail($0)
      group = ""
      next
    }
    !in_labels || /^[[:space:]]*(#.*)?$/ { next }
    {
      match($0, /^[[:space:]]*/)
      indent = RLENGTH
      line = substr($0, indent + 1)
      if (group == "" || indent <= group_indent) {
        if (line !~ /^[A-Za-z0-9_-]+:[[:space:]]*(#.*)?$/) fail(line)
        group = line
        sub(/:.*/, "", group)
        group_indent = indent
        next
      }
      if (line !~ /^[A-Za-z0-9_-]+:/) fail(line)
      key = line
      sub(/:.*/, "", key)
      value = line
      sub(/^[^:]*:[[:space:]]*/, "", value)
      if (value ~ /^"/) {
        if (value ~ /[\\]/) fail(line)
        value = substr(value, 2)
        sub(/".*/, "", value)
      } else if (value ~ /^'\''/) {
        if (value ~ /'\'''\''/) fail(line)
        value = substr(value, 2)
        sub(/'\''.*/, "", value)
      } else {
        sub(/[[:space:]]+#.*$/, "", value)
        sub(/[[:space:]]+$/, "", value)
        if (value ~ /^[{[]/) fail(line)
      }
      print group "." key "\t" value
    }
  ' "$config"); then
    echo "$config の labels を読めない：${mapping##*ERROR$'\t'}" >&2
    echo "labels は block 形式（1 行に 1 つ．例：    fix: \"bug\"）で書く．引用符の中で escape を使わない．" >&2
    exit 1
  fi
else
  echo "$config がないため，既定の label 名を使う．" >&2
fi

# relay.yml で対応づけた名前．対応づけがなければ既定の名前．
mapped_name() {
  local key="$1" default="$2" line
  while IFS= read -r line; do
    if [[ -n "$line" && "${line%%$'\t'*}" == "$key" ]]; then
      echo "${line#*$'\t'}"
      return
    fi
  done <<<"$mapping"
  echo "$default"
}

existing=""
if [[ "$dry_run" == false ]]; then
  existing=$(gh label list --limit 1000 --json name --jq '.[].name' | tr -d '\r')
elif command -v gh >/dev/null 2>&1; then
  existing=$(gh label list --limit 1000 --json name --jq '.[].name' 2>/dev/null | tr -d '\r' || true)
fi

# GitHub の label 名は大文字と小文字を区別しない．
exists() {
  [[ -n "$existing" ]] && grep -Fxqi -- "$1" <<<"$existing"
}

run() {
  if [[ "$dry_run" == true ]]; then
    printf '予定：'
    printf '%q ' "$@"
    printf '\n'
  else
    "$@"
  fi
}

handle() {
  local name="$1" color="$2" description="$3" default="$4"
  if [[ -z "$name" || "$name" == "null" || "$name" == "~" ]]; then
    echo "作らない：対応づけが空（既定の名前は $default）" >&2
  elif ! exists "$name"; then
    run gh label create "$name" --color "$color" --description "$description"
    # 同じ名前に複数の種別を対応づけた場合に，2 回作らない．
    existing+=$'\n'"$name"
  elif [[ "$update" == true && "$name" == "$default" ]]; then
    run gh label edit "$name" --color "$color" --description "$description"
  else
    echo "既にある：$name（変えない）"
  fi
}

for entry in "${status_labels[@]}"; do
  IFS="|" read -r name color description <<<"$entry"
  handle "$name" "$color" "$description" "$name"
done

for entry in "${mapped_labels[@]}"; do
  IFS="|" read -r key default color description <<<"$entry"
  handle "$(mapped_name "$key" "$default")" "$color" "$description" "$default"
done
