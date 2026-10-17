import { createHash } from "node:crypto";

export function json(data: unknown, init?: number | ResponseInit) {
  const base: ResponseInit = typeof init === "number" ? { status: init } : init ?? {};
  return Response.json(data, { ...base, headers: { "cache-control": "no-store", ...(base.headers ?? {}) } });
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

export function hashIp(ip: string) {
  return createHash("sha256").update(`${process.env.IP_HASH_SALT ?? "sbs"}:${ip}`).digest("hex").slice(0, 24);
}

export async function readJson<T = Record<string, unknown>>(req: Request, maxBytes = 20_000): Promise<T | null> {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
