"use client";

import Link from "next/link";
import { useState } from "react";
import type { Model, Task } from "@/lib/catalog";
import { VideoTile } from "./VideoTile";
import s from "./Stage.module.css";

// The hero stage: one task at a time, all four models playing at once.
export function Stage({ tasks, models, initial }: { tasks: Task[]; models: Model[]; initial?: string }) {
  const [slug, setSlug] = useState(initial ?? tasks[0]?.slug);
  const task = tasks.find((t) => t.slug === slug) ?? tasks[0];
  return (
    <div className={`module ${s.stage}`}>
      <div className={s.bar}>
        <div className="seg" role="tablist" aria-label="Choose a build">
          {tasks.map((t) => (
            <button key={t.slug} role="tab" aria-selected={t.slug === task.slug} onClick={() => setSlug(t.slug)}>
              {t.category}
            </button>
          ))}
        </div>
        <Link href={`/tasks/${task.slug}`} className={`btn btn-ghost btn-sm ${s.open}`}>
          Open side by side
          <Arrow />
        </Link>
      </div>
      <div className={s.grid} role="tabpanel" aria-label={task.title}>
        {models.map((m) => (
          <VideoTile key={`${task.slug}-${m.key}`} model={m} run={task.runs[m.key]} view="desktop" />
        ))}
      </div>
      <p className={s.caption}>
        <span className="mono faint">{task.title}</span>
        <span className="faint">·</span>
        <span className="faint">same prompt, one shot, unedited</span>
      </p>
    </div>
  );
}

export function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
