import { ogCard, OG_SIZE } from "@/lib/og";
import { models, tasks } from "@/lib/catalog";
import { mediaUrl, SITE } from "@/lib/site";

export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  const fps = tasks.find((t) => t.slug === "first-person-shooter") ?? tasks[0];
  return ogCard({ kicker: "Claude vs GPT · same prompt, unedited", title: "We don't rate. We let you see.", posters: models.map((m) => mediaUrl(fps.runs[m.key]?.media?.desktop?.poster)) });
}
