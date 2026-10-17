import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";

// Blog architecture: /blog (category hub) → /blog/<category> (paginated hub) → /blog/<category>/<slug>.
export const CATEGORIES = [
  {
    slug: "comparisons",
    title: "Head-to-head notes",
    description: "Close readings of how two or more models handled the same brief: what differs, where, and why it matters for your project.",
  },
  {
    slug: "rounds",
    title: "Round reports",
    description: "What changed between rounds: new models, new briefs, and what the builds show about how models are moving.",
  },
  {
    slug: "building",
    title: "Building with AI",
    description: "Practical notes on getting better interfaces, simulations and games out of coding agents.",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export const PAGE_SIZE = 12;

export type Post = {
  slug: string;
  category: CategorySlug;
  title: string;
  description: string;
  published: string;
  updated: string;
  cover?: string;
  featured?: boolean;
  body: string;
};

const DIR = path.join(process.cwd(), "content", "blog");

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
        published: String(data.published),
        updated: String(data.updated ?? data.published),
        cover: data.cover ? String(data.cover) : undefined,
        featured: Boolean(data.featured),
        body: content,
      });
    }
  }
  return out.sort((a, b) => (a.published < b.published ? 1 : -1));
});

export function getCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function postsIn(category: string) {
  return getAllPosts().filter((p) => p.category === category);
}

export function getPost(category: string, slug: string) {
  return getAllPosts().find((p) => p.category === category && p.slug === slug);
}

export function formatDate(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
