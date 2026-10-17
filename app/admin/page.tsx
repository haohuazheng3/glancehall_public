import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin";
import { db, dbConfigured } from "@/lib/db";
import { AdminClientErrorButton } from "@/components/AdminClientErrorButton";
import { OwnerIdentify } from "@/components/OwnerIdentify";
import s from "./admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

type ErrRow = { fingerprint: string; source: string; name: string; message: string; route: string; count: number; last_seen: string; first_frame: string };
type MsgRow = { id: number; name: string | null; email: string; topic: string | null; message: string; created_at: string; notified: boolean };

export default async function Admin({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const sp = await searchParams;
  if (!(await isAdmin())) {
    return (
      <div className="wrap">
        <form method="post" action="/api/admin/login" className={`module ${s.login}`}>
          <h1 className="h3">Admin</h1>
          <input className="field" type="password" name="token" placeholder="Admin token" autoComplete="current-password" required />
          {sp.e && <p style={{ color: "var(--bad)", margin: 0, fontSize: 14 }}>That token didn&apos;t match.</p>}
          <button className="btn btn-primary" type="submit">
            Sign in
          </button>
        </form>
      </div>
    );
  }
  if (!dbConfigured()) return <div className="wrap">DATABASE_URL is not configured.</div>;
  const sql = db();
  const [errors, messages, subs] = (await Promise.all([
    sql`select fingerprint, source, name, message, route, count, last_seen, first_frame from error_groups where resolved_at is null order by last_seen desc limit 100`,
    sql`select id, name, email, topic, message, created_at, notified from contact_messages order by created_at desc limit 50`,
    sql`select count(*)::int as n, count(*) filter (where created_at > now() - interval '7 days')::int as week from subscribers where unsubscribed_at is null`,
  ])) as [ErrRow[], MsgRow[], { n: number; week: number }[]];
  return (
    <div className="wrap">
      {process.env.OWNER_EMAIL && <OwnerIdentify email={process.env.OWNER_EMAIL} />}
      <div className={s.top}>
        <h1 className="h2">Admin</h1>
        <form method="post" action="/api/admin/logout">
          <button className="btn btn-ghost btn-sm">Sign out</button>
        </form>
      </div>
      <div className={s.stats}>
        <div className="module module-pad">
          <p className="eyebrow">Open errors</p>
          <p className={s.big}>{errors.length}</p>
        </div>
        <div className="module module-pad">
          <p className="eyebrow">Subscribers</p>
          <p className={s.big}>
            {subs[0].n} <span className="faint" style={{ fontSize: 16 }}>+{subs[0].week} this week</span>
          </p>
        </div>
        <div className="module module-pad">
          <p className="eyebrow">Messages</p>
          <p className={s.big}>{messages.length}</p>
        </div>
      </div>

      <section className={`module ${s.panel}`}>
        <div className={s.panelHead}>
          <h2 className="h3">Error inbox</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <AdminClientErrorButton />
            <form method="post" action="/api/admin/test-error">
              <button className="btn btn-ghost btn-sm">Throw server test error</button>
            </form>
            {errors.length > 0 && (
              <form method="post" action="/api/admin/resolve">
                <input type="hidden" name="fingerprint" value="all" />
                <button className="btn btn-ghost btn-sm">Resolve all</button>
              </form>
            )}
          </div>
        </div>
        {errors.length === 0 ? (
          <p className="faint">Nothing open. Good.</p>
        ) : (
          <ul className={s.list}>
            {errors.map((e) => (
              <li key={e.fingerprint} className={s.item}>
                <div className={s.itemMain}>
                  <p className={s.itemTitle}>
                    <span className="chip">{e.source}</span> <strong>{e.name}</strong>: {e.message}
                  </p>
                  <p className="mono faint" style={{ margin: 0, fontSize: 12 }}>
                    {e.route} · {e.first_frame || "no stack"} · ×{e.count} · last {new Date(e.last_seen).toLocaleString("en-US")}
                  </p>
                </div>
                <form method="post" action="/api/admin/resolve">
                  <input type="hidden" name="fingerprint" value={e.fingerprint} />
                  <button className="btn btn-ghost btn-sm">Resolve</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`module ${s.panel}`}>
        <h2 className="h3">Contact messages</h2>
        {messages.length === 0 ? (
          <p className="faint">No messages yet.</p>
        ) : (
          <ul className={s.list}>
            {messages.map((m) => (
              <li key={m.id} className={s.item}>
                <div className={s.itemMain}>
                  <p className={s.itemTitle}>
                    <strong>{m.name || m.email}</strong> <span className="faint">&lt;{m.email}&gt;</span> · {m.topic ?? "—"} {m.notified ? "" : <span className="chip">not emailed</span>}
                  </p>
                  <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 14 }}>{m.message}</p>
                  <p className="faint mono" style={{ margin: 0, fontSize: 12 }}>
                    #{m.id} · {new Date(m.created_at).toLocaleString("en-US")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
