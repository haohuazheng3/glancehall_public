"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Model, Run, Task, ViewKind } from "@/lib/catalog";
import { formatDuration, formatTokens } from "@/lib/catalog";
import { VideoTile } from "./VideoTile";
import { track } from "./Analytics";
import s from "./TaskViewer.module.css";

type Mode = "grid" | "duel" | "single";
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function kb(n?: number) {
  if (!n) return "—";
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

export function TaskViewer({ task, models }: { task: Task; models: Model[] }) {
  const [mode, setMode] = useState<Mode>("grid");
  const [view, setView] = useState<ViewKind>(task.views[0]);
  const [blind, setBlind] = useState(false);
  const [order, setOrder] = useState(models.map((m) => m.key));
  const [pick, setPick] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [duel, setDuel] = useState<[string, string]>([models[0].key, models[models.length - 1].key]);
  const [single, setSingle] = useState(models[0].key);
  const videos = useRef(new Map<string, HTMLVideoElement>());

  // Deep links: ?blind=1 opens blind mode; ?a=<model>&b=<model> opens side by side.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("blind") === "1") return startBlind();
    const a = q.get("a"), b = q.get("b");
    const keys = models.map((m) => m.key);
    if (a && b && a !== b && keys.includes(a) && keys.includes(b)) {
      setDuel([a, b]);
      setMode("duel");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byKey = useMemo(() => Object.fromEntries(models.map((m) => [m.key, m])), [models]);
  const hidden = blind && !revealed;
  const letterOf = (key: string) => LETTERS[order.indexOf(key)];
  const nameOf = (key: string) => (hidden ? `Build ${letterOf(key)}` : byKey[key].name);

  function startBlind() {
    setOrder(shuffle(models.map((m) => m.key)));
    setPick(null);
    setRevealed(false);
    setBlind(true);
    setMode("grid");
    track("blind_start", { task: task.slug });
  }
  function stopBlind() {
    setBlind(false);
    setRevealed(false);
    setPick(null);
    setOrder(models.map((m) => m.key));
  }

  const register = useCallback(
    (key: string) => (el: HTMLVideoElement | null) => {
      if (el) videos.current.set(key, el);
      else videos.current.delete(key);
    },
    []
  );

  const restartAll = () => {
    videos.current.forEach((v) => {
      v.currentTime = 0;
      v.play().catch(() => {});
    });
  };

  const keysInOrder = blind ? order : models.map((m) => m.key);
  const multiView = task.views.length > 1;

  return (
    <div className={s.viewer}>
      <div className={s.toolbarWrap}>
        <div className={s.toolbar} role="toolbar" aria-label="Viewing options">
          <div className="seg" aria-label="Layout">
            <button aria-pressed={mode === "grid"} onClick={() => setMode("grid")}>
              All four
            </button>
            <button aria-pressed={mode === "duel"} onClick={() => setMode("duel")} disabled={hidden} title={hidden ? "Reveal first" : undefined}>
              Side by side
            </button>
            <button aria-pressed={mode === "single"} onClick={() => setMode("single")} disabled={hidden} title={hidden ? "Reveal first" : undefined}>
              One at a time
            </button>
          </div>
          {multiView && (
            <div className="seg" aria-label="Device">
              <button aria-pressed={view === "desktop"} onClick={() => setView("desktop")}>
                Desktop
              </button>
              <button aria-pressed={view === "mobile"} onClick={() => setView("mobile")}>
                Phone
              </button>
            </div>
          )}
          <button className={`${s.switch} ${blind ? s.switchOn : ""}`} aria-pressed={blind} onClick={() => (blind ? stopBlind() : startBlind())}>
            <span className={s.knob} aria-hidden="true" />
            Blind
          </button>
          <button className={s.iconBtn} onClick={restartAll} aria-label="Restart all videos together" title="Restart all together">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.5 8a5.5 5.5 0 1 0 1.7-4" />
              <path d="M2.5 2.5v3h3" />
            </svg>
            <span className={s.iconLabel}>Restart together</span>
          </button>
        </div>
      </div>

      {blind && (
        <div className={`${s.blindBar} ${revealed ? s.blindDone : ""}`} role="status">
          {!pick && !revealed && <span>Names are hidden and the order is shuffled. Pick the build you would ship.</span>}
          {pick && !revealed && (
            <>
              <span>
                You picked <strong>Build {letterOf(pick)}</strong>.
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setRevealed(true);
                  track("blind_reveal", { task: task.slug, pick });
                }}
              >
                Reveal the models
              </button>
            </>
          )}
          {revealed && (
            <>
              <span>
                {pick ? (
                  <>
                    Your pick, Build {letterOf(pick)}, was <strong>{byKey[pick].name}</strong>.
                  </>
                ) : (
                  <>Models revealed.</>
                )}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={startBlind}>
                Shuffle again
              </button>
              <button className="btn btn-ghost btn-sm" onClick={stopBlind}>
                Exit blind mode
              </button>
            </>
          )}
        </div>
      )}

      {blind && pick && !revealed && (
        <div className={s.revealFloat}>
          <span>
            You picked <strong>Build {letterOf(pick)}</strong>
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setRevealed(true);
              track("blind_reveal", { task: task.slug, pick });
            }}
          >
            Reveal
          </button>
        </div>
      )}

      {mode === "grid" && (
        <div className={`${s.grid} ${view === "mobile" ? s.gridPhone : ""}`}>
          {keysInOrder.map((key) => (
            <BuildCard
              key={`${key}-${view}`}
              task={task}
              model={byKey[key]}
              run={task.runs[key]}
              view={view}
              label={nameOf(key)}
              hidden={hidden}
              blind={blind}
              picked={pick === key}
              onPick={() => {
                setPick(key);
                track("blind_pick", { task: task.slug });
              }}
              videoRef={register(key)}
            />
          ))}
        </div>
      )}

      {mode === "duel" && (
        <>
          <div className={s.duelPickers}>
            {[0, 1].map((side) => (
              <div key={side} className="seg" aria-label={side === 0 ? "Left model" : "Right model"}>
                {models.map((m) => (
                  <button
                    key={m.key}
                    aria-pressed={duel[side] === m.key}
                    disabled={duel[1 - side] === m.key}
                    onClick={() => setDuel((d) => (side === 0 ? [m.key, d[1]] : [d[0], m.key]))}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className={`${s.duel} ${view === "mobile" ? s.duelPhone : ""}`}>
            {duel.map((key) => (
              <BuildCard key={`${key}-${view}-duel`} task={task} model={byKey[key]} run={task.runs[key]} view={view} label={byKey[key].name} quality="full" videoRef={register(key)} />
            ))}
          </div>
        </>
      )}

      {mode === "single" && (
        <>
          <div className={s.duelPickers}>
            <div className="seg" aria-label="Model">
              {models.map((m) => (
                <button key={m.key} aria-pressed={single === m.key} onClick={() => setSingle(m.key)}>
                  {m.name}
                </button>
              ))}
            </div>
          </div>
          <div className={`${s.single} ${view === "mobile" ? s.singlePhone : ""}`}>
            <BuildCard key={`${single}-${view}-single`} task={task} model={byKey[single]} run={task.runs[single]} view={view} label={byKey[single].name} quality="full" videoRef={register(single)} />
          </div>
        </>
      )}

      <FactsTable task={task} models={models} hidden={hidden} />
    </div>
  );
}

function BuildCard({
  task,
  model,
  run,
  view,
  label,
  hidden,
  blind,
  picked,
  onPick,
  quality = "preview",
  videoRef,
}: {
  task: Task;
  model: Model;
  run: Run | undefined;
  view: ViewKind;
  label: string;
  hidden?: boolean;
  blind?: boolean;
  picked?: boolean;
  onPick?: () => void;
  quality?: "preview" | "full";
  videoRef: (el: HTMLVideoElement | null) => void;
}) {
  const errors = (run?.runtime?.pageErrors?.length ?? 0) + (run?.runtime?.consoleErrors?.length ?? 0);
  return (
    <article className={`module ${s.card} ${picked ? s.picked : ""} ${hidden ? "" : `m-${model.accent}`}`}>
      <header className={s.cardHead}>
        <span className={s.who}>
          {!hidden && <span className="m-dot" />}
          <span className={s.whoName}>{label}</span>
          {!hidden && <span className={s.effort}>{model.effortLabel}</span>}
        </span>
        {blind && hidden && onPick && run?.status === "ok" && run.media?.[view] && (
          <button className={`btn btn-sm ${picked ? "btn-primary" : "btn-ghost"}`} aria-pressed={picked} onClick={onPick}>
            {picked ? "Your pick" : "Pick this one"}
          </button>
        )}
      </header>
      <VideoTile model={model} run={run} view={view} quality={quality} label={label} hideIdentity={hidden} videoRef={videoRef} showLabel={false} />
      {!hidden && run?.status === "ok" && (
        <footer className={s.cardFoot}>
          <span className={s.stat}>
            <span className="faint">Built in</span> {formatDuration(run.seconds)}
          </span>
          <span className={s.stat}>
            <span className="faint">Errors</span>{" "}
            <span style={{ color: errors ? "var(--warn)" : undefined }}>{run.runtime ? errors : "—"}</span>
          </span>
          <span className={s.actions}>
            <Link className="btn btn-ghost btn-sm" href={`/play/${task.slug}/${model.key}`}>
              Open live
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M4 2h6v6M10 2 3 9" />
              </svg>
            </Link>
          </span>
        </footer>
      )}
      {!hidden && run?.status === "failed" && <footer className={s.cardFoot}><span className="faint">The run ended without an index.html. The transcript is kept as evidence.</span></footer>}
    </article>
  );
}

function FactsTable({ task, models, hidden }: { task: Task; models: Model[]; hidden: boolean }) {
  if (hidden) return null;
  const rows: { label: string; get: (r: Run | undefined) => string; note?: (r: Run | undefined) => string | undefined; hint?: string }[] = [
    { label: "Time to build", get: (r) => formatDuration(r?.seconds) },
    {
      label: "Attempts",
      get: (r) => (r?.attempts ? String(r.attempts) : "—"),
      note: (r) => r?.attemptNotes?.join(" "),
      hint: "Only an infrastructure failure (a rate limit or an outage) earns a retry. Every interrupted attempt is listed, and nothing from it is published.",
    },
    { label: "Delivered source", get: (r) => kb(r?.sourceBytes) },
    { label: "Files", get: (r) => (r?.files?.length ? String(r.files.length) : "—") },
    { label: "Tokens in / out", get: (r) => (r?.inputTokens ? `${formatTokens(r.inputTokens)} / ${formatTokens(r.outputTokens)}` : "—"), hint: "As reported by each CLI. Tokenizers differ between vendors, so compare within a vendor." },
    { label: "Errors during recording", get: (r) => (r?.runtime ? String((r.runtime.pageErrors?.length ?? 0) + (r.runtime.consoleErrors?.length ?? 0)) : "—") },
    { label: "Video length", get: (r) => (r?.media?.[task.views[0]]?.seconds ? `${r.media[task.views[0]]!.seconds}s` : "—"), hint: "UI recordings scroll at a fixed speed, so a longer page makes a longer video." },
  ];
  return (
    <section className={`module ${s.facts}`} aria-labelledby="facts-h">
      <div className={s.factsHead}>
        <h2 id="facts-h" className="h3">
          The facts
        </h2>
        <p className="faint">Measured, not judged. Nothing here is a score.</p>
      </div>
      <div className={s.tableScroll}>
        <table className={s.table}>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Measure</span>
              </th>
              {models.map((m) => (
                <th key={m.key} scope="col" className={`m-${m.accent}`}>
                  <span className={s.th}>
                    <span className="m-dot" />
                    {m.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">
                  {row.label}
                  {row.hint && <span className={s.hint}>{row.hint}</span>}
                </th>
                {models.map((m) => {
                  const note = row.note?.(task.runs[m.key]);
                  return (
                    <td key={m.key} className="mono">
                      {row.get(task.runs[m.key])}
                      {note && <span className={`${s.hint} ${s.cellNote}`}>{note}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Notes task={task} models={models} />
    </section>
  );
}

function Notes({ task, models }: { task: Task; models: Model[] }) {
  const withNotes = models.filter((m) => {
    const rt = task.runs[m.key]?.runtime;
    return rt && (rt.pageErrors?.length ?? 0) + (rt.consoleErrors?.length ?? 0) + (rt.notes?.length ?? 0) > 0;
  });
  if (!withNotes.length) return null;
  return (
    <div className={s.notes}>
      {withNotes.map((m) => {
        const rt = task.runs[m.key].runtime ?? {};
        return (
          <details key={m.key} className={s.note}>
            <summary>
              <span className={`m-${m.accent}`} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span className="m-dot" /> {m.name}
              </span>
              <span className="faint">
                {[...(rt.pageErrors ?? []), ...(rt.consoleErrors ?? [])].length} errors · {(rt.notes ?? []).length} recorder notes
              </span>
            </summary>
            <ul>
              {(rt.pageErrors ?? []).map((e, i) => (
                <li key={`p${i}`} className="mono">
                  <span className={s.tag}>uncaught</span> {e}
                </li>
              ))}
              {(rt.consoleErrors ?? []).map((e, i) => (
                <li key={`c${i}`} className="mono">
                  <span className={s.tag}>console</span> {e}
                </li>
              ))}
              {(rt.notes ?? []).map((e, i) => (
                <li key={`n${i}`}>
                  <span className={s.tag}>recorder</span> {e}
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
