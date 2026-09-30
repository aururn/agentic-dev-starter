// skill pack の静的検査．CI と .agents/relay.yml の checks.full から実行する．
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** 改行を LF にそろえる．Windows で CRLF になった file も同じように読むため． */
const toLf = (text) => text.replace(/\r\n?/g, "\n");

/** SKILL.md の frontmatter を `{ key: value }` にして返す．frontmatter がなければ null を返す． */
export function parseFrontmatter(text) {
  const match = toLf(text).match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) return null;
  return Object.fromEntries(
    match[1].split("\n").map((line) => {
      const i = line.indexOf(":");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
  );
}

/** Issue Forms の file で，GitHub が検証で拒む書き方を返す．今は空の `title` だけを見る． */
export function issueFormErrors(text) {
  return /^title:[ \t]*(?:""|'')?[ \t]*(?:#.*)?$/m.test(toLf(text))
    ? ["title を空にできない．初期の title が要らなければ key ごと消す"]
    : [];
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = [];
  const fail = (file, message) => errors.push(`${relative(root, file).replaceAll("\\", "/")}: ${message}`);
  const read = (file) => toLf(readFileSync(file, "utf8"));

  const files = walk(root);
  const textFiles = files.filter((f) => /\.(md|yml|yaml|mjs|sh)$/.test(f));

  // 1. SKILL.md の frontmatter
  const skillsDir = join(root, "skills");
  for (const name of readdirSync(skillsDir)) {
    const file = join(skillsDir, name, "SKILL.md");
    if (!existsSync(file)) {
      fail(join(skillsDir, name), "SKILL.md がない");
      continue;
    }
    const fields = parseFrontmatter(readFileSync(file, "utf8"));
    if (!fields) {
      fail(file, "frontmatter がない");
      continue;
    }
    if (fields.name !== name) fail(file, `name（${fields.name}）が directory 名（${name}）と違う`);
    if (!/^[a-z0-9-]{1,64}$/.test(fields.name ?? "")) fail(file, "name は英小文字，数字，- の 64 文字以内にする");
    if (!fields.description) fail(file, "description がない");
    else if (fields.description.length > 1024) fail(file, "description は 1024 文字以内にする");
  }

  // 2. Markdown の相対 link の先が存在する
  // relay-adopt の assets は導入先の root を基準に書くので除く．
  for (const file of files.filter((f) => f.endsWith(".md") && !f.includes(join("relay-adopt", "assets")))) {
    const text = read(file).replace(/^(```|~~~)[\s\S]*?^\1/gm, "");
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const path = decodeURI(target.split("#")[0]);
      if (!existsSync(resolve(dirname(file), path))) fail(file, `link の先がない：${target}`);
    }
  }

  // 3. このリポジトリで使う file が，配る file と同じ
  const mirrored = [
    [".github/workflows/relay-pr-policy.yml", "skills/relay-adopt/assets/github/workflows/relay-pr-policy.yml"],
    [".github/scripts/relay-pr-policy.mjs", "skills/relay-adopt/assets/github/scripts/relay-pr-policy.mjs"],
    [".github/pull_request_template.md", "skills/relay-adopt/assets/github/pull_request_template.md"],
    ...readdirSync(join(root, "skills/relay-adopt/assets/github/ISSUE_TEMPLATE")).map((n) => [
      `.github/ISSUE_TEMPLATE/${n}`,
      `skills/relay-adopt/assets/github/ISSUE_TEMPLATE/${n}`,
    ]),
  ];
  for (const [copy, source] of mirrored) {
    const copyPath = join(root, copy);
    if (!existsSync(copyPath)) fail(copyPath, `${source} の copy がない`);
    else if (readFileSync(copyPath, "utf8") !== readFileSync(join(root, source), "utf8")) {
      fail(copyPath, `${source} と内容が違う．配る方を編集して copy する`);
    }
  }

  // 4. 和文の句読点は「．，」を使う
  for (const file of textFiles) {
    read(file)
      .split("\n")
      .forEach((line, i) => {
        if (/[\u3002\u3001]/.test(line)) fail(file, `${i + 1} 行目：句読点は「．，」を使う`);
      });
  }

  // 5. Issue Forms が GitHub の検証に通る
  for (const file of files.filter((f) => /ISSUE_TEMPLATE[\\/](?!config\.)[^\\/]+\.ya?ml$/.test(f))) {
    for (const message of issueFormErrors(readFileSync(file, "utf8"))) fail(file, message);
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(`::error::${e}`);
    console.error(`\n${errors.length} 件の問題がある．`);
    process.exit(1);
  }
  console.log(`ok：skill ${readdirSync(skillsDir).length} 件，file ${files.length} 件を検査した．`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
