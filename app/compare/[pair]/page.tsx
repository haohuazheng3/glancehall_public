import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allPairs, pairSlug, parsePair, primaryView, tasks } from "@/lib/catalog";
import { JsonLd, breadcrumbLd } from "@/lib/seo";
import { VideoTile } from "@/components/VideoTile";
import s from "../../listing.module.css";
import c from "../compare.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return allPairs().map(([a, b]) => ({ pair: pairSlug(a.key, b.key) }));
}

export async function generateMetadata({ params }: { params: Promise<{ pair: string }> }): Promise<Metadata> {
  const p = parsePair((await params).pair);
  if (!p) return {};
  const [a, b] = p;
  return {
    title: `${a.name} vs ${b.name}: four builds, side by side`,
    description: `${a.name} vs ${b.name} on the same four briefs, recorded unedited: a SaaS landing page, an analytics dashboard, a physics simulation and a 3D shooter. No scores, just the work.`,
    alternates: { canonical: `/compare/${pairSlug(a.key, b.key)}` },
  };
}

export default async function PairPage({ params }: { params: Promise<{ pair: string }> }) {
  const p = parsePair((await params).pair);
  if (!p) notFound();
  const [a, b] = p;
  const slug = pairSlug(a.key, b.key);
  return (
    <div className="wrap">
      <JsonLd data={breadcrumbLd([{ name: "Head to head", path: "/compare" }, { name: `${a.name} vs ${b.name}`, path: `/compare/${slug}` }])} />
      <header className={s.head}>
        <p className="eyebrow">Head to head</p>
        <h1 className="h1">
          {a.name} <span className="faint" style={{ fontStyle: "italic" }}>vs</span> {b.name}
        </h1>
        <p className="lede">
          Same four briefs, same single attempt, same recording script. Watch them next to each other and make up your own
          mind.
        </p>
      </header>
      <div className={c.list}>
        {tasks.map((t) => {
          const view = primaryView(t);
          return (
            <section key={t.slug} className={`module ${c.task}`} aria-labelledby={`t-${t.slug}`}>
              <div className={c.taskHead}>
                <div>
                  <p className="eyebrow">{t.category}</p>
                  <h2 id={`t-${t.slug}`} className={c.taskTitle}>
                    {t.title}
                  </h2>
                </div>
                <Link href={`/tasks/${t.slug}?a=${a.key}&b=${b.key}`} className="btn btn-ghost btn-sm">
                  Open this pair in the viewer
                </Link>
              </div>
              <div className={`${c.duo} ${view === "mobile" ? c.duoPhone : ""}`}>
                <VideoTile model={a} run={t.runs[a.key]} view={view} />
                <VideoTile model={b} run={t.runs[b.key]} view={view} />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
