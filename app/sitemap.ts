import type { MetadataRoute } from "next";
import { allPairs, catalog, models, pairSlug, tasks } from "@/lib/catalog";
import { getAllPosts, CATEGORIES } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

// lastmod values are real: the round date for build pages, the edit date for static pages.
export default function sitemap(): MetadataRoute.Sitemap {
  const round = new Date(`${catalog.round.date}T12:00:00Z`);
  const pages = new Date("2026-10-17T12:00:00Z");
  const posts = getAllPosts();
  const u = (p: string, lastModified: Date, priority = 0.6): MetadataRoute.Sitemap[number] => ({ url: `${SITE_URL}${p}`, lastModified, priority });
  return [
    u("/", round, 1),
    u("/tasks", round, 0.9),
    ...tasks.map((t) => u(`/tasks/${t.slug}`, round, 0.9)),
    u("/models", round, 0.7),
    ...models.map((m) => u(`/models/${m.key}`, round, 0.7)),
    u("/compare", round, 0.7),
    ...allPairs().map(([a, b]) => u(`/compare/${pairSlug(a.key, b.key)}`, round, 0.8)),
    ...tasks.flatMap((t) => models.filter((m) => t.runs[m.key]?.status === "ok").map((m) => u(`/play/${t.slug}/${m.key}`, round, 0.5))),
    u("/methodology", pages, 0.6),
    u("/about", pages, 0.4),
    u("/faq", pages, 0.5),
    u("/contact", pages, 0.3),
    u("/privacy", pages, 0.2),
    u("/terms", pages, 0.2),
    ...(posts.length ? [u("/blog", new Date(posts[0].updated), 0.5)] : []),
    ...CATEGORIES.filter((c) => posts.some((p) => p.category === c.slug)).map((c) => u(`/blog/${c.slug}`, new Date(posts.find((p) => p.category === c.slug)!.updated), 0.5)),
    ...posts.map((p) => u(`/blog/${p.category}/${p.slug}`, new Date(p.updated), 0.6)),
  ];
}
