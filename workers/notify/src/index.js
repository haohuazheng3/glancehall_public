// Owner notifications without a mail provider: Cloudflare Email Routing's send_email binding
// delivers to the verified owner address. The website calls POST / with a shared secret.
import { EmailMessage } from "cloudflare:email";

function header(v) {
  // RFC 2047 encoded-word for non-ASCII subjects/names; strip CR/LF to prevent header injection.
  const clean = String(v ?? "").replace(/[\r\n]+/g, " ").slice(0, 300);
  return /^[\x20-\x7e]*$/.test(clean) ? clean : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(clean)))}?=`;
}

function b64Body(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/.{1,76}/g, "$&\r\n");
}

export default {
  async fetch(req, env) {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const auth = req.headers.get("authorization") || "";
    if (!env.NOTIFY_SECRET || auth !== `Bearer ${env.NOTIFY_SECRET}`) return new Response("Unauthorized", { status: 401 });
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }
    const subject = header(body.subject || "Notification");
    const text = String(body.text || "").slice(0, 20000);
    const replyTo = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(body.replyTo || "") ? body.replyTo : null;
    const domain = env.FROM_ADDRESS.split("@")[1];
    const raw = [
      `From: ${header(env.FROM_NAME || "Site")} <${env.FROM_ADDRESS}>`,
      `To: <${env.OWNER_ADDRESS}>`,
      `Subject: ${subject}`,
      replyTo ? `Reply-To: <${replyTo}>` : null,
      `Message-ID: <${crypto.randomUUID()}@${domain}>`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64Body(text),
    ]
      .filter((l) => l !== null)
      .join("\r\n");
    try {
      await env.OWNER.send(new EmailMessage(env.FROM_ADDRESS, env.OWNER_ADDRESS, raw));
      return Response.json({ ok: true });
    } catch (e) {
      return Response.json({ ok: false, error: String(e && e.message ? e.message : e) }, { status: 502 });
    }
  },
};
