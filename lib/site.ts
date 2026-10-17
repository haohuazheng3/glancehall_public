// Single source of truth for brand + deployment facts. Swap the brand here only.
export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "GlanceHall",
  domain: process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "glancehall.com",
  tagline: "We don't rate. We let you see.",
  description:
    "Side-by-side, unedited builds from Claude and GPT. Same prompt, one shot, nothing fixed: watch the websites, dashboards, simulations and games each model actually makes, then judge for yourself.",
  contactEmail: `contact@${process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "glancehall.com"}`,
  foundedYear: 2026,
} as const;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? `https://${SITE.domain}`).replace(/\/$/, "");

// Videos, posters and the live builds themselves are served from the media origin
// (a separate origin on purpose: model-written code never runs on the site's origin).
export const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE ?? "").replace(/\/$/, "");

export function mediaUrl(path: string | undefined | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${MEDIA_BASE}/${path.replace(/^\//, "")}`;
}

// Indexing is off everywhere until launch day flips this on.
export const INDEXABLE = process.env.SITE_INDEXABLE === "true";
