import { CATEGORIES, getAllPosts } from "@/lib/blog";
import { allPairs, catalog, models, pairSlug, tasks } from "@/lib/catalog";
import { SITE, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// A plain-text map of the site for AI crawlers and answer engines: what GlanceHall is, where the
// evidence lives, and one line per page.
export function GET() {
  const posts = getAllPosts();
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.tagline} ${SITE.description}`,
    "",
    `Current round: ${catalog.round.title} (${catalog.round.date}). Models: ${models.map((m) => `${m.name} (${m.effortLabel}, ${m.harness})`).join("; ")}.`,
    "Every model received the identical prompt, made one attempt, and nothing was edited. The site publishes recordings and live builds, never scores.",
    "",
    "## Builds",
    ...tasks.map((t) => `- [${t.title}](${SITE_URL}/tasks/${t.slug}): ${t.summary}`),
    "",
    "## Models",
    ...models.map((m) => `- [${m.name}](${SITE_URL}/models/${m.key}): ${m.vendor}, ${m.effortLabel}, run in ${m.harness}`),
    "",
    "## Head-to-head pairs",
    ...allPairs().map(([a, b]) => `- [${a.name} vs ${b.name}](${SITE_URL}/compare/${pairSlug(a.key, b.key)}): every brief, both builds side by side`),
    "",
    "## Journal",
    ...CATEGORIES.map((c) => `- [${c.h1}](${SITE_URL}/blog/${c.slug}): ${c.description}`),
    ...posts.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.category}/${p.slug}): ${p.description}`),
    "",
    "## About the method",
    `- [How we test](${SITE_URL}/methodology): exact commands, recording method and known limits`,
    `- [FAQ](${SITE_URL}/faq)`,
    `- [About](${SITE_URL}/about): independent, no vendor money, publisher is the ${SITE.name} organisation`,
  ];
  return new Response(lines.join("\n") + "\n", { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
