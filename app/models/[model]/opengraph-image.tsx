import { ogCard, OG_SIZE } from "@/lib/og";
import { getModel, models, tasks } from "@/lib/catalog";
import { mediaUrl } from "@/lib/site";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Every build by this model, unedited";

export function generateStaticParams() {
  return models.map((m) => ({ model: m.key }));
}

export default async function Image({ params }: { params: Promise<{ model: string }> }) {
  const m = getModel((await params).model)!;
  return ogCard({ kicker: `${m.vendor} · ${m.effortLabel}`, title: m.name, posters: tasks.map((t) => mediaUrl(t.runs[m.key]?.media?.desktop?.poster)) });
}
