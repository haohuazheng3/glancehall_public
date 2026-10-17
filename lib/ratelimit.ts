import { db, dbConfigured } from "./db";
import { recordError } from "./errors";

// Fixed window counter in Postgres; shared across all serverless instances.
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; remaining: number }> {
  if (!dbConfigured()) return { ok: true, remaining: limit };
  const windowStart = new Date(Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000).toISOString();
  try {
    const rows = (await db()`
      insert into rate_limits (key, window_start, count) values (${key}, ${windowStart}, 1)
      on conflict (key, window_start) do update set count = rate_limits.count + 1
      returning count`) as { count: number }[];
    const count = rows[0]?.count ?? 1;
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (e) {
    // Fail open so a database hiccup never locks real users out, but make the failure visible.
    await recordError({ source: "server", error: e, route: "lib/ratelimit" });
    return { ok: true, remaining: limit };
  }
}
