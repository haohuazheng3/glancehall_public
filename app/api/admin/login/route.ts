import { ADMIN_COOKIE, sessionValue, tokenMatches } from "@/lib/admin";
import { clientIp, hashIp } from "@/lib/http";
import { rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const limit = await rateLimit(`admin-login:${hashIp(clientIp(req))}`, 8, 900);
  if (!limit.ok) return new Response("Too many attempts", { status: 429 });
  const form = await req.formData();
  if (!tokenMatches(String(form.get("token") ?? ""))) {
    return new Response(null, { status: 303, headers: { location: new URL("/admin?e=1", req.url).toString() } });
  }
  return new Response(null, {
    status: 303,
    headers: {
      location: new URL("/admin", req.url).toString(),
      "set-cookie": `${ADMIN_COOKIE}=${sessionValue()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 14}`,
    },
  });
}
