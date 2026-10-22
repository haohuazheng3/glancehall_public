import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";

// Blog architecture: /blog (category navigation) → /blog/<category> (hub page with its own keyword,
// an editorial intro and a paginated list) → /blog/<category>/<slug> (one intent per post).
export const CATEGORIES = [
  {
    slug: "head-to-head",
    title: "Head-to-head",
    h1: "Claude vs GPT: every head-to-head, same brief, no scores",
    metaTitle: "Claude vs GPT: every head-to-head, same brief",
    description: "Every Claude-versus-GPT comparison on the site, each one anchored to builds you can watch and open: landing pages, dashboards, apps, simulations and games from one identical prompt.",
    keywords: ["claude vs gpt", "gpt vs claude"],
  },
  {
    slug: "best-ai-for",
    title: "Best AI for…",
    h1: "AI for coding: which model for which job, by what it built",
    metaTitle: "AI for coding: which model for which job",
    description: "Picking an AI for coding by task rather than by leaderboard: what four frontier models actually shipped for websites, dashboards, apps, UI and games, with the builds open to inspect.",
    keywords: ["ai for coding", "coding ai"],
  },
  {
    slug: "can-ai-build",
    title: "Can AI build it?",
    h1: "Can AI write code? 32 one-shot builds answer it",
    metaTitle: "Can AI write code? 32 one-shot builds answer it",
    description: "Whether AI can build a website, an app or a game is not a matter of opinion here. Each question links to unedited builds from Claude and GPT models, recorded and playable.",
    keywords: ["can ai write code", "can ai code"],
  },
  {
    slug: "model-reviews",
    title: "Model reviews",
    h1: "LLM comparison: the four models we test, in facts and builds",
    metaTitle: "LLM comparison: the four models we test",
    description: "Claude Opus 5.5, Claude Fable 5.1, GPT-6 Astra and GPT-6.1 Sol reviewed by their output: release facts, prices, run times, token use and eight builds each, side by side.",
    keywords: ["llm comparison", "ai model reviews"],
  },
  {
    slug: "coding-agents",
    title: "Coding agents",
    h1: "AI coding agents: Claude Code vs Codex, and which is the best coding agent",
    metaTitle: "AI coding agents: Claude Code vs Codex, by output",
    description: "Claude Code and OpenAI Codex ran the same eight briefs, one shot each, nothing fixed afterwards. These pages compare the agents by what they shipped, not by what their makers claim.",
    keywords: ["ai coding agents", "best coding agent"],
  },
  {
    slug: "testing",
    title: "Testing & method",
    h1: "How to test AI models yourself: our method, and the blind test",
    metaTitle: "How to test AI models yourself: method and blind test",
    description: "How GlanceHall tests coding models without scores: identical prompts, one attempt, fixed recording scripts and a blind test you can run in a minute. Plus what public benchmarks can and cannot show.",
    keywords: ["how to test ai models", "how to evaluate llms"],
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export type Category = (typeof CATEGORIES)[number];
export const PAGE_SIZE = 12;

export type Faq = { q: string; a: string };
export type Credit = { name: string; url: string };

export type Post = {
  slug: string;
  category: CategorySlug;
  title: string;
  description: string;
  published: string;
  updated: string;
  level: "A" | "B";
  keywords: string[];
  faq: Faq[];
  cover?: string;
  coverAlt?: string;
  coverCredit?: Credit;
  coverSize?: [number, number];
  related: string[];
  featured?: boolean;
  body: string;
  words: number;
};

export type Hub = { title: string; description: string; updated: string; body: string };

const DIR = path.join(process.cwd(), "content", "blog");

// YAML turns 2026-10-22 into a Date; keep dates as plain YYYY-MM-DD strings everywhere.
function day(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
}
const HUBS = path.join(process.cwd(), "content", "hubs");

// Prose words only: frontmatter is already stripped, JSX tags, code fences and markdown syntax are not counted.
export function countWords(body: string) {
  const text = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_>|`-]+/g, " ");
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

export const getAllPosts = cache((): Post[] => {
  const out: Post[] = [];
  for (const c of CATEGORIES) {
    const dir = path.join(DIR, c.slug);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".mdx"))) {
      const { data, content } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
      if (data.draft) continue;
      out.push({
        slug: f.replace(/\.mdx$/, ""),
        category: c.slug,
        title: String(data.title),
        description: String(data.description ?? ""),
        published: day(data.published),
        updated: day(data.updated ?? data.published),
        level: data.level === "B" ? "B" : "A",
        keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
        faq: Array.isArray(data.faq) ? data.faq.map((x: { q: string; a: string }) => ({ q: String(x.q), a: String(x.a) })) : [],
        cover: data.cover ? String(data.cover) : undefined,
        coverAlt: data.coverAlt ? String(data.coverAlt) : undefined,
        coverCredit: data.coverCredit ? { name: String(data.coverCredit.name), url: String(data.coverCredit.url) } : undefined,
        coverSize: Array.isArray(data.coverSize) && data.coverSize.length === 2 ? [Number(data.coverSize[0]), Number(data.coverSize[1])] : undefined,
        related: Array.isArray(data.related) ? data.related.map(String) : [],
        featured: Boolean(data.featured),
        body: content,
        words: countWords(content),
      });
    }
  }
  return out.sort((a, b) => (a.published < b.published ? 1 : -1));
});

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function postsIn(category: string) {
  return getAllPosts().filter((p) => p.category === category);
}

export function getPost(category: string, slug: string) {
  return getAllPosts().find((p) => p.category === category && p.slug === slug);
}

export function findPost(slug: string) {
  return getAllPosts().find((p) => p.slug === slug);
}

// Three related posts: the ones the author named first, then the newest in the same category.
export function relatedPosts(p: Post, n = 3) {
  const named = p.related.map((s) => findPost(s)).filter((x): x is Post => Boolean(x) && x!.slug !== p.slug);
  const same = postsIn(p.category).filter((x) => x.slug !== p.slug && !named.includes(x));
  return [...named, ...same].slice(0, n);
}

// Posts that embed or discuss a given brief or model, the most focused first: used to link money pages
// back to the journal. A post's focus is how many times it embeds or links the brief or model.
function ranked(re: RegExp, n: number) {
  return getAllPosts()
    .map((p) => ({ p, score: (p.body.match(re) ?? []).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (a.p.published < b.p.published ? 1 : -1))
    .slice(0, n)
    .map((x) => x.p);
}

export function postsForTask(slug: string, n = 4) {
  return ranked(new RegExp(`task="${slug}"|/tasks/${slug}\\b`, "g"), n);
}

export function postsForModel(key: string, n = 4) {
  return ranked(new RegExp(`(?:model|a|b)="${key}"|models="[^"]*${key}|/models/${key}\\b`, "g"), n);
}

export const getHub = cache((slug: string): Hub | null => {
  const f = path.join(HUBS, `${slug}.mdx`);
  if (!fs.existsSync(f)) return null;
  const { data, content } = matter(fs.readFileSync(f, "utf8"));
  return { title: String(data.title ?? ""), description: String(data.description ?? ""), updated: day(data.updated), body: content };
});

// Heading ids the way rehype-slug (github-slugger) makes them, so the table of contents links resolve.
export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

export function headings(body: string) {
  const out: { id: string; text: string }[] = [];
  const seen = new Map<string, number>();
  for (const line of body.split("\n")) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = m[1].replace(/[*_`]/g, "");
    let id = slugify(text);
    const n = seen.get(id) ?? 0;
    seen.set(id, n + 1);
    if (n) id = `${id}-${n}`;
    out.push({ id, text });
  }
  return out;
}

export function readingMinutes(words: number) {
  return Math.max(1, Math.round(words / 220));
}

export function formatDate(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
