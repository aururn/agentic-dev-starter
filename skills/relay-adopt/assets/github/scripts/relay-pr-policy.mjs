// Relay の PR 本文の検査．GitHub Actions の pull_request event で実行する．
// 規則：relay-core/references/formats.md の「CI による検査」
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const CLOSING =
  /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+(?:(?:https:\/\/github\.com\/)?([\w.-]+\/[\w.-]+)(?:#|\/issues\/)|#)(\d+)\b/gi;
const HEAD = /(?:確認した\s*head|verified\s+head)\s*[:：]\s*`?([0-9a-f]{7,40})`?/i;
const FAILED_ROW = /^\s*\|\s*❌/m;

/** HTML comment と fenced code block を除く．例や説明の中の記法を検査しないため． */
export function stripNonContent(body) {
  return body.replace(/<!--[\s\S]*?-->/g, "").replace(/^(```|~~~)[\s\S]*?^\1/gm, "");
}

/** 本文が閉じる Issue を `owner/repo#N` または `#N` の形で重複なく返す． */
export function closingRefs(body) {
  const refs = new Set();
  for (const m of stripNonContent(body).matchAll(CLOSING)) {
    refs.add(`${m[1] ? m[1].toLowerCase() : ""}#${m[2]}`);
  }
  return [...refs];
}

/**
 * @param {{ body: string, headSha: string, isDraft: boolean, labels: string[] }} pr
 * @returns {{ errors: string[], warnings: string[], skipped: boolean }}
 */
export function evaluate({ body, headSha, isDraft, labels }) {
  const errors = [];
  const warnings = [];
  if (labels.includes("relay:release")) {
    return { errors, warnings, skipped: true };
  }
  const text = stripNonContent(body ?? "");
  const strict = (message) => (isDraft ? warnings : errors).push(message);

  const refs = closingRefs(text);
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

  if (FAILED_ROW.test(text)) {
    strict(
      "確かめたことに ❌ が残っている．直して確かめ直す．直さない場合は，その判断を「見てほしいところ」に書き，行を ⏭ にする．",
    );
  }

  return { errors, warnings, skipped: false };
}

function main() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const pr = event.pull_request;
  const result = evaluate({
    body: pr.body ?? "",
    headSha: pr.head.sha,
    isDraft: Boolean(pr.draft),
    labels: (pr.labels ?? []).map((l) => l.name),
  });

  const lines = [];
  if (result.skipped) {
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
