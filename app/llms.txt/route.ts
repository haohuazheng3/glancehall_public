import { catalog, models, tasks } from "@/lib/catalog";
import { SITE, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
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
    "## About the method",
    `- [How we test](${SITE_URL}/methodology): exact commands, recording method and known limits`,
    `- [FAQ](${SITE_URL}/faq)`,
    `- [About](${SITE_URL}/about)`,
  ];
  return new Response(lines.join("\n") + "\n", { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
