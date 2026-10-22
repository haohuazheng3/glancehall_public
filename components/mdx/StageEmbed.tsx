"use client";

import Link from "next/link";
import { useState } from "react";
import type { Model, Task, ViewKind } from "@/lib/catalog";
import { VideoTile } from "@/components/VideoTile";
import s from "./mdx.module.css";

// The stage embedded in an article: the selected models' builds of one brief, a desktop/phone switch when
// the brief was recorded on both, and the blind test one click away.
export function StageEmbed({ task, models, initialView, caption }: { task: Task; models: Model[]; initialView: ViewKind; caption?: string }) {
  const [view, setView] = useState<ViewKind>(initialView);
  const both = task.views.length > 1;
  return (
    <div className={`module ${s.embed}`}>
      <div className={s.bar}>
        <span className="eyebrow">{task.title} · same prompt, one shot, unedited</span>
        <div className={s.actions}>
          {both && (
            <div className="seg" role="group" aria-label="Viewport">
              {task.views.map((v) => (
                <button key={v} type="button" aria-pressed={v === view} onClick={() => setView(v)}>
                  {v === "desktop" ? "Desktop" : "Phone"}
                </button>
              ))}
            </div>
          )}
          <Link className="btn btn-primary btn-sm" href={`/tasks/${task.slug}?blind=1`}>
            Blind test
          </Link>
          <Link className="btn btn-ghost btn-sm" href={`/tasks/${task.slug}`}>
            Open side by side
          </Link>
        </div>
      </div>
      <div className={`${s.grid} ${view === "mobile" || models.length > 2 ? s.grid4 : ""}`}>
        {models.map((m) => (
          <div key={`${m.key}-${view}`} className={s.cell}>
            <VideoTile model={m} run={task.runs[m.key]} view={view} />
            {task.runs[m.key]?.status === "ok" && (
              <Link href={`/play/${task.slug}/${m.key}`} className={s.open}>
                Open {m.name}&rsquo;s build
              </Link>
            )}
          </div>
        ))}
      </div>
      {caption && <p className={s.caption}>{caption}</p>}
    </div>
  );
}
