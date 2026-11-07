import { db, dbConfigured } from "@/lib/db";
import { json } from "@/lib/http";
import { notifyOwner } from "@/lib/notify";
import { rateLimit } from "@/lib/ratelimit";
import { SITE, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const DAY_SEC = 24 * 60 * 60;
const TOP = 5;

type Row = { source: string; name: string; message: string; route: string | null; count: number; first_seen: string; last_seen: string };

const stamp = (v: string) => new Date(v).toISOString().slice(0, 16).replace("T", " ") + "Z";

// Daily digest of the open error inbox, emailed to the owner. The uptime probe (workers/health) calls this
// once a day while /api/health reports openErrors > 0. It needs no secret because it is idempotent and only
// ever writes to the owner: at most one email per UTC day (fixed-window row in rate_limits), none when the
// inbox is empty. Read-only on error_groups: nothing is resolved or changed here.
export async function POST() {
  if (!dbConfigured()) return json({ sent: false, reason: "database not configured" });
  const sql = db();
  const [totals, top] = (await Promise.all([
    sql`select count(*) filter (where severity = 'error')::int as errors,
               count(*) filter (where severity <> 'error')::int as warnings
        from error_groups where resolved_at is null`,
    sql`select source, name, left(message, 200) as message, route, count, first_seen, last_seen
        from error_groups where resolved_at is null and severity = 'error'
        order by last_seen desc limit ${TOP}`,
  ])) as [{ errors: number; warnings: number }[], Row[]];
  const { errors, warnings } = totals[0] ?? { errors: 0, warnings: 0 };
  if (errors === 0) return json({ sent: false, reason: "no open errors" });

  // Claim today's slot first so concurrent callers can't both send.
  const slot = await rateLimit("digest:open-errors", 1, DAY_SEC);
  if (!slot.ok) return json({ sent: false, reason: "already sent today", openErrors: errors });

  const day = new Date().toISOString().slice(0, 10);
  const lines = top.map((r, i) => {
    const what = r.message.startsWith(r.name) ? r.message : `${r.name}: ${r.message}`;
    return `${i + 1}. [${r.source}] ${what}\n   ${r.route || "(no route)"} · ×${r.count} · first ${stamp(r.first_seen)} · last ${stamp(r.last_seen)}`;
  });
  const text = [
    `${errors} unresolved error${errors === 1 ? "" : "s"} in the ${SITE.name} error inbox on ${day} (UTC)` +
      (warnings ? `, plus ${warnings} warning${warnings === 1 ? "" : "s"}` : "") +
      ". The site itself is up: this is the once-a-day inbox summary, not an outage alert.",
    "",
    errors > TOP ? `Most recent ${TOP}:` : "Most recent first:",
    ...lines,
    "",
    `Review and resolve: ${SITE_URL}/admin`,
    "At most one digest per UTC day, and none while the inbox has no open errors.",
  ].join("\n");
  const sent = await notifyOwner(`[${SITE.name}] ${errors} open error${errors === 1 ? "" : "s"} in the inbox (daily digest)`, text);
  return json({ sent, reason: sent ? null : "notify failed", openErrors: errors });
}
