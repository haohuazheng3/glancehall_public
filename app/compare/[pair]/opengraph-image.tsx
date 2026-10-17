import { ogCard, OG_SIZE } from "@/lib/og";
import { allPairs, pairSlug, parsePair, tasks } from "@/lib/catalog";
import { mediaUrl } from "@/lib/site";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Two AI models, side by side on the same briefs";

export function generateStaticParams() {
  return allPairs().map(([a, b]) => ({ pair: pairSlug(a.key, b.key) }));
}

export default async function Image({ params }: { params: Promise<{ pair: string }> }) {
  const [a, b] = parsePair((await params).pair)!;
  const t = tasks.find((x) => x.slug === "saas-landing-page") ?? tasks[0];
  const g = tasks.find((x) => x.slug === "first-person-shooter") ?? tasks[0];
  return ogCard({
    kicker: "Head to head",
    title: `${a.name} vs ${b.name}`,
    posters: [t.runs[a.key], t.runs[b.key], g.runs[a.key], g.runs[b.key]].map((r) => mediaUrl(r?.media?.desktop?.poster)),
  });
}
