import { ogCard, OG_SIZE } from "@/lib/og";
import { getTask, models, tasks } from "@/lib/catalog";
import { mediaUrl } from "@/lib/site";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Four AI models build the same thing, side by side";

export function generateStaticParams() {
  return tasks.map((t) => ({ task: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ task: string }> }) {
  const t = getTask((await params).task)!;
  return ogCard({ kicker: `${t.category} · ${models.length} models`, title: t.title, posters: models.map((m) => mediaUrl(t.runs[m.key]?.media?.desktop?.poster)) });
}
