import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalog, getTask, models, primaryView, tasks } from "@/lib/catalog";
import { mediaUrl } from "@/lib/site";
import { JsonLd, breadcrumbLd, videoLd } from "@/lib/seo";
import { TaskViewer } from "@/components/TaskViewer";
import { PromptBlock } from "@/components/PromptBlock";
import { Arrow } from "@/components/Stage";
import s from "./task.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return tasks.map((t) => ({ task: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ task: string }> }): Promise<Metadata> {
  const task = getTask((await params).task);
  if (!task) return {};
  const names = models.map((m) => m.name).join(", ");
  return {
    title: `${task.title}: ${models.length} AI models, side by side`,
    description: `Watch ${names} build the same ${task.title.toLowerCase()} from one prompt, unedited. ${task.summary}`.slice(0, 300),
    alternates: { canonical: `/tasks/${task.slug}` },
  };
}

export default async function TaskPage({ params }: { params: Promise<{ task: string }> }) {
  const task = getTask((await params).task);
  if (!task) notFound();
  const idx = tasks.findIndex((t) => t.slug === task.slug);
  const prev = tasks[(idx - 1 + tasks.length) % tasks.length];
  const next = tasks[(idx + 1) % tasks.length];
  const recorded = new Date(catalog.round.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const videos = models
    .map((m) => ({ m, v: task.runs[m.key]?.media?.[primaryView(task)] }))
    .filter((x) => x.v?.mp4 && x.v?.poster)
    .map(({ m, v }) =>
      videoLd({
        name: `${m.name} builds a ${task.title.toLowerCase()}`,
        description: `Unedited recording of the ${task.title.toLowerCase()} that ${m.name} built in one shot from the same prompt as every other model.`,
        // Portrait recordings keep their own size; the schema just needs real numbers.
        thumbnailUrl: mediaUrl(v!.poster)!,
        contentUrl: mediaUrl(v!.mp4)!,
        uploadDate: `${catalog.round.date}T12:00:00Z`,
        durationSec: v!.seconds,
        pagePath: `/tasks/${task.slug}`,
      })
    );
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Builds", path: "/tasks" },
            { name: task.title, path: `/tasks/${task.slug}` },
          ]),
          ...videos,
        ]}
      />
      <div className={`wrap ${s.head}`}>
        <nav aria-label="Breadcrumb" className={s.crumbs}>
          <Link href="/tasks">Builds</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{task.category}</span>
        </nav>
        <h1 className="h1">{task.title}</h1>
        <p className="lede">{task.summary}</p>
        <p className={s.meta}>
          <span className="chip">{task.category}</span>
          <span className="chip">{models.length} models · one shot each</span>
          <span className="chip">Recorded {recorded}</span>
        </p>
      </div>

      <div className={`wrap ${s.body}`}>
        <TaskViewer task={task} models={models} />

        <div className={s.lower}>
          <section className={`module ${s.watch}`} aria-labelledby="watch-h">
            <h2 id="watch-h" className="h3">
              What to look for
            </h2>
            <p className="faint" style={{ margin: "6px 0 16px", fontSize: 13.5 }}>
              Questions, not answers. The call is yours.
            </p>
            <ol className={s.watchList}>
              {task.watchFor.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ol>
          </section>
          <section className={`module ${s.watch}`} aria-labelledby="rec-h">
            <h2 id="rec-h" className="h3">
              How it was recorded
            </h2>
            <p className="muted" style={{ margin: "10px 0 14px", fontSize: 14.5 }}>
              {task.interaction}
            </p>
            <p className="faint" style={{ margin: 0, fontSize: 13.5 }}>
              The same script runs on every build. Open any build live to judge sound, feel and anything a video can&apos;t show.{" "}
              <Link href="/methodology" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                Full method
              </Link>
            </p>
          </section>
        </div>

        <PromptBlock prompt={task.prompt} />

        <nav className={s.pager} aria-label="Other builds">
          <Link href={`/tasks/${prev.slug}`} className={`module lift ${s.pageLink}`}>
            <span className="eyebrow">Previous</span>
            <span className={s.pageTitle}>{prev.title}</span>
          </Link>
          <Link href={`/tasks/${next.slug}`} className={`module lift ${s.pageLink} ${s.pageNext}`}>
            <span className="eyebrow">Next</span>
            <span className={s.pageTitle}>
              {next.title} <Arrow />
            </span>
          </Link>
        </nav>
      </div>
    </>
  );
}
