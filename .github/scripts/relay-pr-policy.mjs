// Relay の PR 本文の検査．GitHub Actions の pull_request event で実行する．
// 規則：relay-core/references/formats.md の「CI による検査」
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const CLOSING =
  /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+(?:(?:https:\/\/github\.com\/)?([\w.-]+\/[\w.-]+)(?:#|\/issues\/)|#)(\d+)\b/gi;
const HEAD = /(?:確認した\s*head|verified\s+head)\s*[:：]\s*`?([0-9a-f]{7,40})`?/i;
const FAILED_ROW = /^\s*\|\s*❌/m;
const HEADING = /^(#{1,6})[ \t]+(.*?)[ \t#]*$/;
const VERIFIED_SECTION = /^(?:確かめたこと|verification)$/i;

/** 改行を LF にそろえ，HTML comment と fenced code block を除く．例や説明の中の記法を検査しないため． */
export function stripNonContent(body) {
  return body
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^(```|~~~)[\s\S]*?^\1/gm, "");
}

/** inline code を除く．GitHub は inline code の中の closing keyword で Issue を閉じないため． */
export function stripInlineCode(text) {
  return text.replace(/(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g, "");
}

/**
 * 「確かめたこと」の節の本文を返す．節は次の同じ深さ以上の見出しの手前で終わる．
 * 節が複数あれば全てをつなげて返す．節の 1 つだけを見て，他の節の ❌ を見逃さないため．
 * 節がない場合は null を返す．
 */
export function verifiedSection(text) {
  const sections = [];
  let current = null;
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const h = line.match(HEADING);
    if (h && current && h[1].length <= current.level) current = null;
    if (h && VERIFIED_SECTION.test(h[2])) {
      current = { level: h[1].length, lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return sections.length ? sections.map((s) => s.lines.join("\n")).join("\n") : null;
}

/**
 * 本文が閉じる Issue を `owner/repo#N` の形で重複なく返す．
 * `#N` は `repo`（PR の repository）の Issue として数える．同じ Issue を短い形と完全な形で書いても 1 件にするため．
 */
export function closingRefs(body, repo = "") {
  const refs = new Set();
  for (const m of stripInlineCode(stripNonContent(body)).matchAll(CLOSING)) {
    refs.add(`${(m[1] ?? repo).toLowerCase()}#${m[2]}`);
  }
  return [...refs];
}

/**
 * @param {{ body: string, headSha: string, isDraft: boolean, labels: string[], repo?: string }} pr
 * @returns {{ errors: string[], warnings: string[], skipped: boolean }}
 */
export function evaluate({ body, headSha, isDraft, labels, repo = "" }) {
  const errors = [];
  const warnings = [];
  if (labels.includes("relay:release")) {
    return { errors, warnings, skipped: true };
  }
  const text = stripNonContent(body ?? "");
  const strict = (message) => (isDraft ? warnings : errors).push(message);

  const refs = closingRefs(text, repo);
  if (refs.length !== 1) {
    errors.push(
      `閉じる Issue は 1 件だけにする（検出：${refs.length} 件${refs.length ? `，${refs.join(", ")}` : ""}）．` +
        "例：1 行目に `Closes #12` と書く．",
    );
  }

  const head = text.match(HEAD);
  if (!head) {
    strict("「確認した head: `<SHA>`」がない．確かめたことの表を得た commit を書く．");
  } else if (!headSha.toLowerCase().startsWith(head[1].toLowerCase())) {
    strict(
      `「確認した head:」（${head[1]}）が今の head（${headSha.slice(0, 7)}）と違う．` +
        "今の head で確かめ直し，表と一緒に更新する．",
    );
  }

  // 「確かめたこと」の節だけを見る．他の節の ❌ は，例えば仕様の表の値であり，確認の結果ではないため．
  // 節がない場合は本文全体を見る．節の見出しを消して検査を避けられないようにするため．
  if (FAILED_ROW.test(verifiedSection(text) ?? text)) {
    strict(
      "確かめたことに ❌ が残っている．直して確かめ直す．直さない場合は，その判断を「見てほしいところ」に書き，行を ⏭ にする．",
    );
  }

  return { errors, warnings, skipped: false };
}

/**
 * GitHub の event から検査の入力を作る．PR の event でなければ null を返す．
 * merge queue（merge_group）では，PR の本文は PR の event で検査済みなので検査しない．
 */
export function inputFromEvent(event) {
  const pr = event.pull_request;
  if (!pr) return null;
  return {
    body: pr.body ?? "",
    headSha: pr.head.sha,
    isDraft: Boolean(pr.draft),
    labels: (pr.labels ?? []).map((l) => l.name),
    repo: event.repository?.full_name ?? "",
  };
}

function main() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const input = inputFromEvent(event);
  const result = input ? evaluate(input) : { errors: [], warnings: [], skipped: true };

  const lines = [];
  if (!input) {
    lines.push("PR の event ではない（merge queue など）ので検査しない．");
  } else if (result.skipped) {
    lines.push("relay:release の PR なので検査しない．");
  }
  for (const w of result.warnings) {
    console.log(`::warning title=relay-pr-policy::${w}`);
    lines.push(`- ⚠️ ${w}`);
  }
  for (const e of result.errors) {
    console.log(`::error title=relay-pr-policy::${e}`);
    lines.push(`- ❌ ${e}`);
  }
  if (!result.skipped && lines.length === 0) {
    lines.push("- ✅ 全ての検査に通った．");
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### relay-pr-policy\n\n${lines.join("\n")}\n`);
  }
  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
