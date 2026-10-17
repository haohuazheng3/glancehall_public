import { z } from "zod";
import { db, dbConfigured } from "@/lib/db";
import { recordError } from "@/lib/errors";
import { clientIp, hashIp, json, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  source: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: "Please enter a valid email address." }, 400);
  const limit = await rateLimit(`sub:${hashIp(clientIp(req))}`, 6, 600);
  if (!limit.ok) return json({ error: "Too many attempts. Please try again in a few minutes." }, 429);
  if (!dbConfigured()) return json({ error: "Subscriptions are temporarily unavailable." }, 503);
  try {
    await db()`
      insert into subscribers (email, source) values (${parsed.data.email}, ${parsed.data.source ?? "site"})
      on conflict (email) do update set unsubscribed_at = null`;
    return json({ ok: true });
  } catch (e) {
    await recordError({ source: "server", error: e, route: "/api/subscribe" });
    return json({ error: "Something went wrong on our side. Please try again." }, 500);
  }
}
