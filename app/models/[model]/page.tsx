import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { briefNouns, formatDuration, getModel, harnessLabel, models, numberWord, pairSlug, primaryView, tasks } from "@/lib/catalog";
import { JsonLd, breadcrumbLd } from "@/lib/seo";
import { VideoTile } from "@/components/VideoTile";
import { PostList } from "@/components/PostList";
import { postsForModel } from "@/lib/blog";
import { Arrow } from "@/components/Stage";
import s from "./model.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return models.map((m) => ({ model: m.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ model: string }> }): Promise<Metadata> {
  const m = getModel((await params).model);
  if (!m) return {};
  return {
    title: `${m.name} builds: all ${numberWord(tasks.length)} briefs, unedited`,
    description: `Watch what ${m.name} (${m.effortLabel.toLowerCase()}) actually builds from one prompt, across ${numberWord(tasks.length)} briefs from ${briefNouns()[0]} to ${briefNouns()[tasks.length - 1]}, recorded without edits.`,
    alternates: { canonical: `/models/${m.key}` },
  };
}

export default async function ModelPage({ params }: { params: Promise<{ model: string }> }) {
  const m = getModel((await params).model);
  if (!m) notFound();
  const related = postsForModel(m.key);
  const rivals = models.filter((x) => x.key !== m.key);
  const pairHref = (o: string) => {
    const i = models.findIndex((x) => x.key === m.key);
    const j = models.findIndex((x) => x.key === o);
    return `/compare/${i < j ? pairSlug(m.key, o) : pairSlug(o, m.key)}`;
  };
  return (
    <div className="wrap">
      <JsonLd data={breadcrumbLd([{ name: "Models", path: "/models" }, { name: m.name, path: `/models/${m.key}` }])} />
      <header className={`${s.head} m-${m.accent}`}>
        <nav aria-label="Breadcrumb" className={s.crumbs}>
          <Link href="/models">Models</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{m.vendor}</span>
        </nav>
        <h1 className="h1">
          <span className={s.dotBig} aria-hidden="true" />
          {m.name}
        </h1>
        <dl className={s.facts}>
          <div>
            <dt>Vendor</dt>
            <dd>{m.vendor}</dd>
          </div>
          <div>
            <dt>Model id</dt>
            <dd className="mono">{m.model_id}</dd>
          </div>
          <div>
            <dt>Effort</dt>
            <dd>{m.effortLabel}</dd>
          </div>
          <div>
            <dt>Harness</dt>
            <dd>{harnessLabel(m)}</dd>
          </div>
        </dl>
      </header>

      <div className={s.builds}>
        {tasks.map((t) => {
          const run = t.runs[m.key];
          const view = primaryView(t);
          return (
            <article key={t.slug} className={`module ${s.build}`}>
              <div className={view === "mobile" ? s.phoneTile : undefined}>
                <VideoTile model={m} run={run} view={view} showLabel={false} />
              </div>
              <div className={s.buildText}>
                <p className="eyebrow">{t.category}</p>
                <h2 className={s.buildTitle}>{t.title}</h2>
                <p className="faint" style={{ margin: 0, fontSize: 13.5 }}>
                  {run?.status === "ok" ? `Built in ${formatDuration(run.seconds)}` : run?.status === "failed" ? "No working build delivered" : "In progress"}
                </p>
                <div className={s.links}>
                  <Link href={`/tasks/${t.slug}`} className="btn btn-ghost btn-sm">
                    Compare all four
                  </Link>
                  {run?.status === "ok" && (
                    <Link href={`/play/${t.slug}/${m.key}`} className="btn btn-ghost btn-sm">
                      Open live
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <section className="section" aria-labelledby="vs-h" style={{ marginTop: 72 }}>
        <h2 id="vs-h" className="h2" style={{ marginBottom: 24 }}>
          Head to head
        </h2>
        <div className={s.vs}>
          {rivals.map((o) => (
            <Link key={o.key} href={pairHref(o.key)} className={`module lift ${s.vsCard}`}>
              <span className={`m-${m.accent}`} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span className="m-dot" />
                {m.name}
              </span>
              <span className="faint">vs</span>
              <span className={`m-${o.accent}`} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span className="m-dot" />
                {o.name}
              </span>
              <Arrow />
            </Link>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="section" aria-labelledby="journal-h" style={{ marginTop: 72 }}>
          <h2 id="journal-h" className="h2" style={{ marginBottom: 24 }}>
            Read more about {m.name}
          </h2>
          <PostList posts={related} />
        </section>
      )}
    </div>
  );
}
