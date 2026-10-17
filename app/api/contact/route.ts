import { z } from "zod";
import { db, dbConfigured } from "@/lib/db";
import { recordError } from "@/lib/errors";
import { clientIp, hashIp, json, readJson } from "@/lib/http";
import { notifyOwner } from "@/lib/notify";
import { rateLimit } from "@/lib/ratelimit";

const Body = z.object({
  name: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().toLowerCase().email().max(200),
  topic: z.string().trim().max(60).optional().nullable(),
  message: z.string().trim().min(5).max(5000),
  website: z.string().max(200).optional().nullable(), // honeypot: real people leave it empty
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: "Please add your email and a message of at least a few words." }, 400);
  const { name, email, topic, message, website } = parsed.data;
  if (website) return json({ ok: true }); // silently drop bots
  const ipHash = hashIp(clientIp(req));
  const limit = await rateLimit(`contact:${ipHash}`, 4, 600);
  if (!limit.ok) return json({ error: "That's a lot of messages. Please wait a few minutes." }, 429);
  if (!dbConfigured()) return json({ error: "The form is temporarily unavailable. Please email us instead." }, 503);
  try {
    const rows = (await db()`
      insert into contact_messages (name, email, topic, message, ip_hash, user_agent)
      values (${name ?? null}, ${email}, ${topic ?? null}, ${message}, ${ipHash}, ${(req.headers.get("user-agent") ?? "").slice(0, 300)})
      returning id`) as { id: number }[];
    const sent = await notifyOwner(
      `[Contact] ${topic ?? "Message"} from ${name || email}`,
      `From: ${name || "(no name)"} <${email}>\nTopic: ${topic ?? "-"}\n\n${message}\n\n— message #${rows[0].id}`,
      email
    );
    if (sent) await db()`update contact_messages set notified = true where id = ${rows[0].id}`;
    return json({ ok: true });
  } catch (e) {
    await recordError({ source: "server", error: e, route: "/api/contact" });
    return json({ error: "Something went wrong on our side. Please email us instead." }, 500);
  }
}
