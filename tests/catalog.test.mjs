import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const catalog = JSON.parse(fs.readFileSync("content/catalog.json", "utf8"));

test("every task has a prompt, a unique slug and an entry for every model", () => {
  const slugs = new Set();
  for (const t of catalog.tasks) {
    assert.ok(t.prompt && t.prompt.length > 200, `${t.slug} prompt too short`);
    assert.ok(!slugs.has(t.slug), `duplicate slug ${t.slug}`);
    slugs.add(t.slug);
    for (const m of catalog.models) assert.ok(t.runs[m.key], `${t.slug} missing run for ${m.key}`);
  }
});

test("finished runs point at a published build and recorded media paths look right", () => {
  for (const t of catalog.tasks) {
    for (const [key, r] of Object.entries(t.runs)) {
      if (r.status !== "ok") continue;
      assert.equal(r.artifact, `${catalog.round.id}/${t.slug}/${key}/build/index.html`);
      for (const v of Object.values(r.media ?? {})) {
        assert.match(v.mp4, new RegExp(`^${catalog.round.id}/${t.slug}/${key}/`));
        assert.ok(v.poster && v.preview, `${t.slug}/${key} media incomplete`);
      }
    }
  }
});

test("the prompt shown on the site is byte-identical to the prompt that was sent", () => {
  for (const t of catalog.tasks) {
    const sent = fs.readFileSync(`tasks/${t.dir}/prompt.txt`, "utf8").trim();
    assert.equal(t.prompt, sent, `${t.slug} prompt drifted`);
  }
});
