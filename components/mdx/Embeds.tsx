import Link from "next/link";
import type { ReactNode } from "react";
import { formatDuration, formatTokens, formatUsd, getModel, getTask, models as allModels, primaryView, tasks as allTasks, type Model, type Run, type Task, type ViewKind } from "@/lib/catalog";
import { VideoTile } from "@/components/VideoTile";
import { PromptBlock } from "@/components/PromptBlock";
import { StageEmbed } from "./StageEmbed";
import s from "./mdx.module.css";

// Components available inside blog MDX. They read the static catalog, so every embed shows the real
// build for that brief and model; a slug that is not in the catalog renders nothing (the content gate
// test fails the build before that can reach production).

function pickModels(keys?: string): Model[] {
  if (!keys) return allModels;
  return keys
    .split(",")
    .map((k) => getModel(k.trim()))
    .filter((m): m is Model => Boolean(m));
}

function playable(run: Run | undefined) {
  return run?.status === "ok";
}

// The core tool, embedded: every selected model's recording for one brief, with the blind test one click away.
export function BuildStage({ task, models, view, caption }: { task: string; models?: string; view?: ViewKind; caption?: string }) {
  const t = getTask(task);
  if (!t) return null;
  const ms = pickModels(models);
  const v = view && t.views.includes(view) ? view : primaryView(t);
  return <StageEmbed task={t} models={ms} initialView={v} caption={caption} />;
}

// Two models on one brief.
export function Duel({ task, a, b, view, caption }: { task: string; a: string; b: string; view?: ViewKind; caption?: string }) {
  return <BuildStage task={task} models={`${a},${b}`} view={view} caption={caption} />;
}

// One model, every brief it has finished.
export function ModelGrid({ model, caption }: { model: string; caption?: string }) {
  const m = getModel(model);
  if (!m) return null;
  const done = allTasks.filter((t) => t.runs[m.key]);
  return (
    <div className={`module ${s.embed}`}>
      <div className={s.bar}>
        <span className="eyebrow">
          {m.name} · {m.effortLabel.toLowerCase()} · {m.harness}
        </span>
        <Link className="btn btn-ghost btn-sm" href={`/models/${m.key}`}>
          All of {m.name}&rsquo;s builds
        </Link>
      </div>
      <div className={`${s.grid} ${s.grid4}`}>
        {done.map((t) => (
          <div key={t.slug} className={s.cell}>
            <VideoTile model={m} run={t.runs[m.key]} view={primaryView(t)} label={t.title} />
            {playable(t.runs[m.key]) && (
              <Link href={`/play/${t.slug}/${m.key}`} className={s.open}>
                Open the {t.title.toLowerCase()}
              </Link>
            )}
          </div>
        ))}
      </div>
      {caption && <p className={s.caption}>{caption}</p>}
    </div>
  );
}

// A loud, single-purpose call to the blind test.
export function BlindCta({ task, children }: { task: string; children?: ReactNode }) {
  const t = getTask(task);
  if (!t) return null;
  return (
    <div className={`module ${s.cta}`}>
      <p>{children ?? <>Can you tell which model built which? Four builds, labels hidden, one brief: pick first, then reveal.</>}</p>
      <Link className="btn btn-primary" href={`/tasks/${t.slug}?blind=1`}>
        Take the blind test
      </Link>
    </div>
  );
}

export function OpenBuild({ task, model, children }: { task: string; model: string; children?: ReactNode }) {
  const t = getTask(task);
  const m = getModel(model);
  if (!t || !m || !playable(t.runs[m.key])) return null;
  return <Link href={`/play/${t.slug}/${m.key}`}>{children ?? `Open ${m.name}'s ${t.title.toLowerCase()}`}</Link>;
}

function errorsOf(run: Run) {
  const r = run.runtime;
  if (!r) return "—";
  const n = (r.consoleErrors?.length ?? 0) + (r.pageErrors?.length ?? 0);
  return n === 0 ? "0" : String(n);
}

function outputOf(run: Run) {
  if (run.outputTokens == null) return run.status === "ok" ? "not recorded (stopped at the 150-minute limit)" : "—";
  return formatTokens(run.outputTokens);
}

// The facts table for one brief, every model: no scores, just what happened.
export function TaskFacts({ task }: { task: string }) {
  const t = getTask(task);
  if (!t) return null;
  return (
    <div className={`module ${s.facts}`}>
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Finished</th>
            <th>Wall time</th>
            <th>Output tokens</th>
            <th>Files</th>
            <th>Source size</th>
            <th>Runtime errors</th>
            <th>API-equivalent cost</th>
            <th>Attempts</th>
          </tr>
        </thead>
        <tbody>
          {allModels.map((m) => {
            const r = t.runs[m.key];
            if (!r) return null;
            return (
              <tr key={m.key}>
                <td>
                  <span className={`m-dot ${m.accent}`} /> {m.name}
                </td>
                <td>{r.status === "ok" ? "Yes" : r.status === "failed" ? "No" : "Pending"}</td>
                <td>{formatDuration(r.seconds)}</td>
                <td>{outputOf(r)}</td>
                <td>{r.files?.length ?? "—"}</td>
                <td>{r.sourceBytes ? `${Math.round(r.sourceBytes / 1024)} KB` : "—"}</td>
                <td>{errorsOf(r)}</td>
                <td>{formatUsd(r.apiCostUsd)}</td>
                <td>{r.attempts ?? 1}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// The facts table for one model, every brief.
export function ModelFacts({ model }: { model: string }) {
  const m = getModel(model);
  if (!m) return null;
  return (
    <div className={`module ${s.facts}`}>
      <table>
        <thead>
          <tr>
            <th>Brief</th>
            <th>Finished</th>
            <th>Wall time</th>
            <th>Output tokens</th>
            <th>Files</th>
            <th>Source size</th>
            <th>Runtime errors</th>
            <th>API-equivalent cost</th>
            <th>Attempts</th>
          </tr>
        </thead>
        <tbody>
          {allTasks.map((t) => {
            const r = t.runs[m.key];
            if (!r) return null;
            return (
              <tr key={t.slug}>
                <td>
                  <Link href={`/tasks/${t.slug}`}>{t.title}</Link>
                </td>
                <td>{r.status === "ok" ? "Yes" : r.status === "failed" ? "No" : "Pending"}</td>
                <td>{formatDuration(r.seconds)}</td>
                <td>{outputOf(r)}</td>
                <td>{r.files?.length ?? "—"}</td>
                <td>{r.sourceBytes ? `${Math.round(r.sourceBytes / 1024)} KB` : "—"}</td>
                <td>{errorsOf(r)}</td>
                <td>{formatUsd(r.apiCostUsd)}</td>
                <td>{r.attempts ?? 1}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// One row per model, aggregated over every brief it has finished: the numbers a comparison chart needs.
export function ModelSummary() {
  const rows = allModels.map((m) => {
    const runs = allTasks.map((t) => t.runs[m.key]).filter((r): r is Run => Boolean(r) && r.status !== "pending");
    const ok = runs.filter((r) => r.status === "ok");
    const secs = ok.map((r) => r.seconds ?? 0).sort((a, b) => a - b);
    const median = secs.length ? (secs.length % 2 ? secs[(secs.length - 1) / 2] : (secs[secs.length / 2 - 1] + secs[secs.length / 2]) / 2) : undefined;
    const out = ok.reduce((s, r) => s + (r.outputTokens ?? 0), 0);
    const costs = ok.map((r) => r.apiCostUsd).filter((c): c is number => c != null);
    const errors = ok.reduce((s, r) => s + (r.runtime?.consoleErrors?.length ?? 0) + (r.runtime?.pageErrors?.length ?? 0), 0);
    const interrupted = runs.reduce((s, r) => s + Math.max(0, (r.attempts ?? 1) - 1), 0);
    const capped = ok.filter((r) => r.outputTokens == null).length;
    return { m, done: ok.length, total: allTasks.length, median, out, cost: costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : null, errors, interrupted, capped };
  });
  return (
    <div className={`module ${s.facts}`}>
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Briefs finished</th>
            <th>Median wall time</th>
            <th>Output tokens, all briefs</th>
            <th>Average API-equivalent cost per build</th>
            <th>Runtime errors</th>
            <th>Interrupted attempts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ m, done, total, median, out, cost, errors, interrupted, capped }) => (
            <tr key={m.key}>
              <td>
                <Link href={`/models/${m.key}`}>
                  <span className={`m-dot ${m.accent}`} /> {m.name}
                </Link>
              </td>
              <td>
                {done} of {total}
              </td>
              <td>{formatDuration(median)}</td>
              <td>
                {formatTokens(out)}
                {capped ? ` (+${capped} not recorded)` : ""}
              </td>
              <td>{formatUsd(cost)}</td>
              <td>{errors}</td>
              <td>{interrupted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// API-equivalent cost of every build: one row per brief, one column per model, straight from the catalog.
export function CostTable() {
  return (
    <div className={`module ${s.facts}`}>
      <table>
        <thead>
          <tr>
            <th>Brief</th>
            {allModels.map((m) => (
              <th key={m.key}>{m.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allTasks.map((t) => (
            <tr key={t.slug}>
              <td>
                <Link href={`/tasks/${t.slug}`}>{t.title}</Link>
              </td>
              {allModels.map((m) => {
                const r = t.runs[m.key];
                const cell = !r || r.status === "pending" ? "in progress" : r.apiCostUsd == null ? "not recorded" : formatUsd(r.apiCostUsd);
                return <td key={m.key}>{cell}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The exact prompt for a brief, collapsible, with copy.
export function PromptOf({ task }: { task: string }) {
  const t = getTask(task);
  if (!t) return null;
  return <PromptBlock prompt={t.prompt} />;
}

// A photo with its credit. Plain <img>: no image-optimisation bill, dimensions set so nothing shifts.
export function Figure({ src, alt, width, height, credit, creditUrl, caption }: { src: string; alt: string; width: number; height: number; credit: string; creditUrl: string; caption?: string }) {
  return (
    <figure className={s.figure}>
      <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" />
      <figcaption>
        {caption ? `${caption} ` : ""}
        Photo by <a href={creditUrl} rel="nofollow noopener" target="_blank">{credit}</a> on Pexels.
      </figcaption>
    </figure>
  );
}

// The first-screen conclusion card on B-level pages.
export function Verdict({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className={`module ${s.verdict}`} aria-label="Conclusion">
      <p className={s.verdictTitle}>{title}</p>
      {children}
    </aside>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <aside className={`module ${s.note}`}>{children}</aside>;
}

export function Toc({ items }: { items: { id: string; text: string }[] }) {
  if (items.length < 3) return null;
  return (
    <nav className={`module ${s.toc}`} aria-label="Table of contents">
      <span className="eyebrow">On this page</span>
      <ol>
        {items.map((h) => (
          <li key={h.id}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export const mdxComponents = { BuildStage, Duel, ModelGrid, BlindCta, OpenBuild, TaskFacts, ModelFacts, ModelSummary, CostTable, PromptOf, Figure, Verdict, Note };
