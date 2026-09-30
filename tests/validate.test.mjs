import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { issueFormErrors, parseFrontmatter } from "../scripts/validate.mjs";

const assets = new URL("../skills/relay-adopt/assets/github/", import.meta.url);

describe("parseFrontmatter", () => {
  const lines = ["---", "name: relay-build", "description: Issue を実装する", "---", "", "# relay-build"];

  test("改行が LF の SKILL.md の frontmatter を読む", () => {
    assert.deepEqual(parseFrontmatter(lines.join("\n")), { name: "relay-build", description: "Issue を実装する" });
  });

  test("改行が CRLF の SKILL.md の frontmatter も同じに読む", () => {
    assert.deepEqual(parseFrontmatter(lines.join("\r\n")), { name: "relay-build", description: "Issue を実装する" });
  });

  test("frontmatter がなければ null を返す", () => {
    assert.equal(parseFrontmatter("# relay-build\n"), null);
  });
});

describe("issueFormErrors", () => {
  test("空の title を拒む", () => {
    for (const title of ['title: ""', "title: ''", "title:"]) {
      assert.equal(issueFormErrors(`name: 作業\n${title}\nbody: []\n`).length, 1, title);
    }
  });

  test("title がない form と，値のある title は通す", () => {
    assert.deepEqual(issueFormErrors("name: 作業\nbody: []\n"), []);
    assert.deepEqual(issueFormErrors('name: 作業\ntitle: "[bug] "\nbody: []\n'), []);
  });

  test("配る Issue template は全て通る", () => {
    const dir = new URL("ISSUE_TEMPLATE/", assets);
    for (const name of readdirSync(dir).filter((n) => n !== "config.yml")) {
      assert.deepEqual(issueFormErrors(readFileSync(new URL(name, dir), "utf8")), [], name);
    }
  });
});

describe("workflow", () => {
  // setup-node は package.json に packageManager: npm があると自動で cache し，lockfile がないと失敗する．
  test("package.json があり lockfile がない repository でも setup-node で止まらない", () => {
    const text = readFileSync(new URL("workflows/relay-pr-policy.yml", assets), "utf8");
    assert.match(text, /uses: actions\/setup-node@[\s\S]*?package-manager-cache: false/);
  });
});
