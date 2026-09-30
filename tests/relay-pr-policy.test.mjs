import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { closingRefs, evaluate, inputFromEvent } from "../skills/relay-adopt/assets/github/scripts/relay-pr-policy.mjs";

const HEAD_SHA = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
const body = (lines) => lines.join("\n");
const valid = body(["Closes #12", "", "## 確かめたこと", "確認した head: `a1b2c3d`", "", "| | 確認 | 結果 |", "| --- | --- | --- |", "| ✅ | CI | 成功 |"]);
const run = (overrides) => evaluate({ body: valid, headSha: HEAD_SHA, isDraft: false, labels: [], ...overrides });

describe("closingRefs", () => {
  test("GitHub が認める closing keyword を全て数える", () => {
    const text = body(["Closes #1", "fixes #2", "Resolved: #3", "close owner/repo#4", "Fix https://github.com/o/r/issues/5"]);
    assert.deepEqual(closingRefs(text, "me/app"), ["me/app#1", "me/app#2", "me/app#3", "owner/repo#4", "o/r#5"]);
  });

  test("同じ Issue を 2 回書いても 1 件と数える", () => {
    assert.deepEqual(closingRefs(body(["Closes #1", "Fixes #1"])), ["#1"]);
  });

  test("同じ Issue を短い形と完全な形で書いても 1 件と数える", () => {
    const text = body(["Closes #12", "Fixes https://github.com/Me/App/issues/12"]);
    assert.deepEqual(closingRefs(text, "me/app"), ["me/app#12"]);
  });

  test("comment と code block の中の記法は数えない", () => {
    const text = body(["<!-- Closes #9 -->", "```", "Closes #8", "```", "Closes #1"]);
    assert.deepEqual(closingRefs(text), ["#1"]);
  });

  test("参照だけの #N は数えない", () => {
    assert.deepEqual(closingRefs("関連：#3，#4 を参照"), []);
  });
});

describe("evaluate", () => {
  test("規則を満たす PR は error も warning も出さない", () => {
    assert.deepEqual(run({}), { errors: [], warnings: [], skipped: false });
  });

  test("閉じる Issue がない PR は Draft でも失敗する", () => {
    const result = run({ body: valid.replace("Closes #12", ""), isDraft: true });
    assert.equal(result.errors.length, 1);
  });

  test("閉じる Issue が 2 件の PR は失敗する", () => {
    const result = run({ body: `${valid}\nCloses #13` });
    assert.match(result.errors[0], /2 件/);
  });

  test("head が古い PR は Draft では警告，Draft 解除後は失敗する", () => {
    const stale = valid.replace("a1b2c3d", "ffff000");
    assert.equal(run({ body: stale, isDraft: true }).warnings.length, 1);
    assert.equal(run({ body: stale, isDraft: true }).errors.length, 0);
    assert.equal(run({ body: stale, isDraft: false }).errors.length, 1);
  });

  test("head の行がない PR は Draft 解除後に失敗する", () => {
    const result = run({ body: valid.replace(/確認した head.*\n/, "") });
    assert.equal(result.errors.length, 1);
  });

  test("❌ の行が残る PR は Draft 解除後に失敗する", () => {
    const result = run({ body: `${valid}\n| ❌ | npm test | 1 件失敗 |` });
    assert.equal(result.errors.length, 1);
  });

  test("relay:release の PR は検査しない", () => {
    const result = run({ body: "", labels: ["relay:release"] });
    assert.deepEqual(result, { errors: [], warnings: [], skipped: true });
  });

  test("英語の Verified head と大文字の SHA も受け付ける", () => {
    const result = run({ body: valid.replace("確認した head: `a1b2c3d`", "Verified head: A1B2C3D") });
    assert.deepEqual(result.errors, []);
  });
});

describe("inputFromEvent", () => {
  test("PR の event から本文，head，Draft，label を取り出す", () => {
    const event = {
      repository: { full_name: "me/app" },
      pull_request: { body: "Closes #1", head: { sha: HEAD_SHA }, draft: true, labels: [{ name: "relay:review" }] },
    };
    assert.deepEqual(inputFromEvent(event), {
      body: "Closes #1",
      headSha: HEAD_SHA,
      isDraft: true,
      labels: ["relay:review"],
      repo: "me/app",
    });
  });

  test("merge queue の event では検査の入力を作らない", () => {
    assert.equal(inputFromEvent({ merge_group: { head_sha: HEAD_SHA } }), null);
  });
});
