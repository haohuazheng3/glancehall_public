import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("public gate passes and never lists internal notes or secrets", () => {
  const r = spawnSync("node", ["scripts/public-gate.mjs"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const listed = r.stdout.split("\n").filter((l) => l.startsWith("  + ")).map((l) => l.slice(4));
  const md = listed.filter((f) => /\.mdx?$/i.test(f));
  assert.deepEqual(md, ["README.md"]);
  for (const f of listed) {
    assert.ok(!/^\.env(?!\.example)/.test(f), `${f} must not be public`);
    assert.ok(!f.startsWith("content/runs/"), `${f} must not be public`);
    assert.ok(!f.startsWith(".github/"), `${f} must not be public`);
  }
});
