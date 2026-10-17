import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "sbs_admin";

function sign(value: string) {
  return createHmac("sha256", process.env.ADMIN_TOKEN ?? "").update(value).digest("hex");
}

export function sessionValue() {
  return sign("admin-session-v1");
}

export function tokenMatches(token: string) {
  const expected = process.env.ADMIN_TOKEN ?? "";
  if (!expected || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isAdmin() {
  if (!process.env.ADMIN_TOKEN) return false;
  const c = (await cookies()).get(ADMIN_COOKIE)?.value ?? "";
  const expected = sessionValue();
  return c.length === expected.length && timingSafeEqual(Buffer.from(c), Buffer.from(expected));
}

// For API routes: cookie session or a bearer token (used by scripts and the health workflow).
export async function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ") && tokenMatches(auth.slice(7))) return true;
  return isAdmin();
}
