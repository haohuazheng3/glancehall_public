import { clientIp, hashIp, json } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

// A harmless endpoint for verifying rate limiting: 10 requests per minute per visitor.
export async function GET(req: Request) {
  const r = await rateLimit(`limit-test:${hashIp(clientIp(req))}`, 10, 60);
  return json({ ok: r.ok, remaining: r.remaining }, r.ok ? 200 : 429);
}
