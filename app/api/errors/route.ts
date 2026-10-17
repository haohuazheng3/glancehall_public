import { z } from "zod";
import { recordError } from "@/lib/errors";
import { clientIp, hashIp, json, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";

const Body = z.object({
  name: z.string().max(120).optional(),
  message: z.string().max(1000),
  stack: z.string().max(4000).optional(),
  route: z.string().max(300).optional(),
});

// Intake for browser errors reported by ClientErrorReporter and the error boundaries.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req, 12_000));
  if (!parsed.success) return json({ error: "bad report" }, 400);
  const limit = await rateLimit(`err:${hashIp(clientIp(req))}`, 20, 600);
  if (!limit.ok) return json({ ok: false }, 429);
  await recordError({
    source: "client",
    name: parsed.data.name,
    message: parsed.data.message,
    stack: parsed.data.stack,
    route: parsed.data.route,
    extra: { ua: (req.headers.get("user-agent") ?? "").slice(0, 200) },
  });
  return json({ ok: true });
}
