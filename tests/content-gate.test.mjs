// The four publishing gates, automated: every blog post must anchor to the core product, keep its
// content-type contract, carry zero internal notes or placeholders, and deliver what its title promises
// in a form the reader can act on. Deploy cancels itself when this fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const BLOG = path.join(ROOT, "content", "blog");
const HUBS = path.join(ROOT, "content", "hubs");
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "catalog.json"), "utf8"));
const taskSlugs = new Set(catalog.tasks.map((t) => t.slug));
const modelKeys = new Set(catalog.models.map((m) => m.key));
const pairs = new Set();
for (let i = 0; i < catalog.models.length; i++) for (let j = i + 1; j < catalog.models.length; j++) pairs.add(`${catalog.models[i].key}-vs-${catalog.models[j].key}`);
const categories = ["head-to-head", "best-ai-for", "can-ai-build", "model-reviews", "coding-agents", "testing"];
const staticRoutes = new Set(["/", "/tasks", "/models", "/compare", "/methodology", "/about", "/faq", "/contact", "/privacy", "/terms", "/blog", "/llms.txt", ...categories.map((c) => `/blog/${c}`)]);

const posts = [];
for (const c of categories) {
  const dir = path.join(BLOG, c);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".mdx"))) {
    const raw = fs.readFileSync(path.join(dir, f), "utf8");
    const { data, content } = matter(raw);
    if (data.draft) continue; // held back until its builds are published
    posts.push({ file: `${c}/${f}`, slug: f.replace(/\.mdx$/, ""), category: c, data, content, raw });
  }
}
const postSlugs = new Set(posts.map((p) => `/blog/${p.category}/${p.slug}`));

function words(body) {
  const text = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_>|`-]+/g, " ");
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

// Gate 3: internal notes and placeholders never ship (any CJK text inside an English page counts too).
const PLACEHOLDER = /\b(TODO|TBD|FIXME|XXX|lorem|ipsum)\b|\[待|待补|待确认|占位|内部|备注|注：以下|示例数据|\bspec\b|\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u;

function internalLinkOk(href) {
  const clean = href.split("#")[0].split("?")[0].replace(/\/$/, "") || "/";
  if (staticRoutes.has(clean) || postSlugs.has(clean)) return true;
  let m;
  if ((m = /^\/tasks\/([a-z0-9-]+)$/.exec(clean))) return taskSlugs.has(m[1]);
  if ((m = /^\/models\/([a-z0-9-]+)$/.exec(clean))) return modelKeys.has(m[1]);
  if ((m = /^\/compare\/([a-z0-9-]+)$/.exec(clean))) return pairs.has(m[1]);
  if ((m = /^\/play\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(clean))) {
    const t = catalog.tasks.find((x) => x.slug === m[1]);
    return Boolean(t && t.runs[m[2]] && t.runs[m[2]].status === "ok");
  }
  if (/^\/blog\/[a-z-]+\/page\/\d+$/.test(clean)) return true;
  return false;
}

test("blog posts: frontmatter, contract, placeholders, links, embeds", () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const p of posts) {
    const d = p.data;
    const where = p.file;
    for (const k of ["title", "description", "published", "level", "keywords", "faq", "cover", "coverAlt", "coverCredit"]) assert.ok(d[k] != null && d[k] !== "", `${where}: missing ${k}`);
    assert.ok(["A", "B"].includes(d.level), `${where}: level must be A or B`);
    assert.ok(d.title.length <= 110 && d.title.length >= 20, `${where}: title length ${d.title.length}`);
    assert.ok(d.description.length >= 70 && d.description.length <= 200, `${where}: description length ${d.description.length}`);
    assert.ok(!titles.has(d.title), `${where}: duplicate title`);
    titles.add(d.title);
    assert.ok(!descriptions.has(d.description), `${where}: duplicate description`);
    descriptions.add(d.description);
    assert.ok(Array.isArray(d.keywords) && d.keywords.length >= 2 && d.keywords.length <= 8, `${where}: 2–8 keywords`);
    assert.ok(Array.isArray(d.faq) && d.faq.length >= 3 && d.faq.length <= 5, `${where}: FAQ must have 3–5 items`);
    for (const f of d.faq) assert.ok(f.q && f.a && f.a.length >= 40, `${where}: FAQ answers need substance`);
    assert.ok(/^https:\/\//.test(d.cover) && d.coverCredit.name && /^https:\/\//.test(d.coverCredit.url), `${where}: cover with Pexels credit`);
    const pub = d.published instanceof Date ? d.published.toISOString().slice(0, 10) : String(d.published);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(pub), `${where}: published date`);

    // Content-type contract: tool-first A pages are 300–800 words, B pages 1200–1500.
    const n = words(p.content);
    if (d.level === "A") assert.ok(n >= 300 && n <= 800, `${where}: A-level body is ${n} words (300–800)`);
    else assert.ok(n >= 1200 && n <= 1500, `${where}: B-level body is ${n} words (1200–1500)`);

    // Structure: Answer-First sections and a conclusion card on B pages.
    const h2 = (p.content.match(/^## /gm) || []).length;
    assert.ok(h2 >= 3, `${where}: needs at least 3 H2 sections (${h2})`);
    if (d.level === "B") {
      assert.ok(/^\s*<Verdict\b/.test(p.content), `${where}: B-level page must open with a <Verdict> card`);
      assert.ok(/<TableOfContents\s*\/>/.test(p.content), `${where}: B-level page needs <TableOfContents />`);
    } else {
      const firstBlock = p.content.split(/\n\s*\n/).slice(0, 3).join("\n");
      assert.ok(/<(BuildStage|Duel|ModelGrid|BlindCta|TaskFacts|ModelFacts|ModelSummary)\b/.test(firstBlock), `${where}: A-level page must put the tool in the first screen (within the first two paragraphs)`);
    }

    // Anchor to the product: an embedded build or blind-test entry, plus 2–3 photos.
    assert.ok(/<(BuildStage|Duel|ModelGrid|BlindCta|TaskFacts|ModelFacts|ModelSummary)\b/.test(p.content), `${where}: must embed the core tool`);
    const figures = (p.content.match(/<Figure\b/g) || []).length + 1; // + cover
    assert.ok(figures >= 2 && figures <= 3, `${where}: ${figures} images incl. cover (2–3)`);

    // Evidence: a sourced data point every 150–200 words → at least floor(words/200) external sources + build links.
    const external = new Set(p.content.match(/https?:\/\/[^\s)"'<>]+/g) || []);
    const internal = (p.content.match(/\]\(\/[^)]*\)/g) || []).length + (p.content.match(/<(BuildStage|Duel|ModelGrid|BlindCta|OpenBuild)\b/g) || []).length;
    assert.ok(external.size + Math.min(internal, 3) >= Math.floor(n / 200), `${where}: ${external.size} external sources for ${n} words`);
    assert.ok(internal >= 2, `${where}: at least two internal links/embeds`);

    // Gate 3 scan over the whole file, frontmatter included.
    const hit = PLACEHOLDER.exec(p.raw);
    assert.ok(!hit, `${where}: placeholder or internal note found: "${hit && hit[0]}"`);

    // Every internal link resolves; every embed names a real task/model.
    for (const m of p.content.matchAll(/\]\((\/[^)\s]*)\)/g)) assert.ok(internalLinkOk(m[1]), `${where}: broken internal link ${m[1]}`);
    for (const m of p.content.matchAll(/href="(\/[^"]*)"/g)) assert.ok(internalLinkOk(m[1]), `${where}: broken internal href ${m[1]}`);
    for (const m of p.content.matchAll(/<(BuildStage|Duel|BlindCta|TaskFacts|PromptOf|OpenBuild)\b[^>]*\btask="([^"]+)"/g)) assert.ok(taskSlugs.has(m[2]), `${where}: unknown task ${m[2]}`);
    for (const m of p.content.matchAll(/<(ModelGrid|ModelFacts|OpenBuild)\b[^>]*\bmodel="([^"]+)"/g)) assert.ok(modelKeys.has(m[2]), `${where}: unknown model ${m[2]}`);
    for (const m of p.content.matchAll(/\b(a|b|models)="([^"]+)"/g)) for (const k of m[2].split(",")) assert.ok(modelKeys.has(k.trim()), `${where}: unknown model ${k}`);
    // Related slugs may point at posts still being written; the page skips any that are not published yet.
    for (const r of d.related || []) assert.ok(/^[a-z0-9-]+$/.test(r), `${where}: bad related slug ${r}`);
  }
});

test("hubs: every category has an introduction without placeholders", () => {
  if (!posts.length) return;
  for (const c of categories) {
    if (!posts.some((p) => p.category === c)) continue;
    const f = path.join(HUBS, `${c}.mdx`);
    assert.ok(fs.existsSync(f), `hub intro missing: content/hubs/${c}.mdx`);
    const raw = fs.readFileSync(f, "utf8");
    const { content } = matter(raw);
    const n = words(content);
    assert.ok(n >= 150, `hub ${c}: intro is ${n} words, needs ≥150`);
    const hit = PLACEHOLDER.exec(raw);
    assert.ok(!hit, `hub ${c}: placeholder found: "${hit && hit[0]}"`);
    for (const m of content.matchAll(/\]\((\/[^)\s]*)\)/g)) assert.ok(internalLinkOk(m[1]), `hub ${c}: broken internal link ${m[1]}`);
  }
});

test("one intent per page: no two posts bind the same primary keyword", () => {
  const seen = new Map();
  for (const p of posts) {
    for (const k of p.data.keywords || []) {
      const key = String(k).toLowerCase();
      assert.ok(!seen.has(key), `${p.file} and ${seen.get(key)} both bind "${key}"`);
      seen.set(key, p.file);
    }
  }
});
