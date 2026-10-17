import { db, dbConfigured } from "@/lib/db";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

const REQUIRED = ["DATABASE_URL", "ADMIN_TOKEN", "IP_HASH_SALT", "NEXT_PUBLIC_MEDIA_BASE"];
const OPTIONAL = ["NEXT_PUBLIC_FLOWGLANCE_SITE", "NOTIFY_WEBHOOK_URL", "NOTIFY_WEBHOOK_SECRET", "SITE_INDEXABLE"];

// Self-diagnosis. Reports names only, never values. Non-200 when something needs attention.
export async function GET() {
  const env = Object.fromEntries([...REQUIRED, ...OPTIONAL].map((k) => [k, Boolean(process.env[k])]));
  let database: { ok: boolean; ms?: number; error?: string } = { ok: false, error: "not configured" };
  let openErrors: number | null = null;
  if (dbConfigured()) {
    const t0 = Date.now();
    try {
      const r = (await db()`
        select count(*)::int as n from error_groups
        where resolved_at is null and severity = 'error'`) as { n: number }[];
      openErrors = r[0]?.n ?? 0;
      database = { ok: true, ms: Date.now() - t0 };
    } catch (e) {
      database = { ok: false, error: e instanceof Error ? e.message.slice(0, 160) : "query failed" };
    }
  }
  const missing = REQUIRED.filter((k) => !process.env[k]);
  const healthy = database.ok && missing.length === 0 && (openErrors ?? 0) === 0;
  return json(
    {
      status: healthy ? "ok" : "degraded",
      commit: process.env.NEXT_PUBLIC_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
      database,
      openErrors,
      env,
      missingRequired: missing,
      payments: "none (this site takes no payments)",
      indexable: process.env.SITE_INDEXABLE === "true",
      time: new Date().toISOString(),
    },
    healthy ? 200 : 503
  );
}
