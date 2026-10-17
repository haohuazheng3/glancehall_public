import { recordError } from "./errors";

// Sends an email to the site owner through our Cloudflare Email Worker (no third-party mail service).
export async function notifyOwner(subject: string, text: string, replyTo?: string): Promise<boolean> {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  const secret = process.env.NOTIFY_WEBHOOK_SECRET;
  if (!url || !secret) {
    console.warn("notifyOwner: NOTIFY_WEBHOOK_URL / NOTIFY_WEBHOOK_SECRET not configured; message stored only");
    return false;
  }
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify({ subject, text, replyTo }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`notify webhook responded ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return true;
  } catch (e) {
    await recordError({ source: "server", error: e, route: "lib/notify" });
    return false;
  }
}
