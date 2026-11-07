import regions from "@/lib/consent-regions.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPT_IN = new Set(regions.optIn);

/**
 * Tells the consent manager (components/consent.ts) whether this visitor must opt in before
 * FlowGlance loads. The country comes from Vercel's edge (x-vercel-ip-country, which clients
 * cannot override) and is not stored anywhere.
 */
export async function GET(req: Request) {
  const country = req.headers.get("x-vercel-ip-country")?.toUpperCase() ?? "";
  // Unknown location (local dev, some privacy relays) is treated as opt-in: the conservative default.
  const consentRequired = !country || OPT_IN.has(country);
  // The browser keeps the answer for a day and the consent manager remembers the region in a
  // cookie, so the lookup runs about once per visitor rather than on every page.
  return Response.json(
    { consentRequired, country: country || null },
    { headers: { "Cache-Control": "private, max-age=86400" } },
  );
}
