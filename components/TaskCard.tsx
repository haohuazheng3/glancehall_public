import Link from "next/link";
import type { Model, Task } from "@/lib/catalog";
import { mediaUrl } from "@/lib/site";
import { Arrow } from "./Stage";
import s from "./TaskCard.module.css";

export function TaskCard({ task, models, index }: { task: Task; models: Model[]; index: number }) {
  return (
    <Link href={`/tasks/${task.slug}`} className={`module lift ${s.card}`}>
      <div className={s.head}>
        <span className="eyebrow">
          {String(index + 1).padStart(2, "0")} · {task.category}
        </span>
        <span className={s.go} aria-hidden="true">
          <Arrow />
        </span>
      </div>
      <h3 className={s.title}>{task.title}</h3>
      <p className={s.summary}>{task.summary}</p>
      <div className={s.thumbs}>
        {models.map((m) => {
          const run = task.runs[m.key];
          const poster = mediaUrl(run?.media?.desktop?.posterSmall ?? run?.media?.desktop?.poster);
          return (
            <div key={m.key} className={`${s.thumb} m-${m.accent}`}>
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={poster} alt={`${m.name}'s ${task.title.toLowerCase()}`} loading="lazy" decoding="async" />
              ) : (
                <div className={`skeleton ${s.ph}`} />
              )}
              <span className={s.who}>
                <span className="m-dot" />
                {m.name}
              </span>
            </div>
          );
        })}
      </div>
    </Link>
  );
}
