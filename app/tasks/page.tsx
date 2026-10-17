import type { Metadata } from "next";
import { catalog, models, tasks } from "@/lib/catalog";
import { TaskCard } from "@/components/TaskCard";
import s from "../listing.module.css";

export const metadata: Metadata = {
  title: "All builds",
  description: "Every brief in the current round: a SaaS landing page, an analytics dashboard, a physics simulation and a 3D shooter, each built by Claude and GPT from the same prompt.",
  alternates: { canonical: "/tasks" },
};

export default function TasksPage() {
  return (
    <div className="wrap">
      <header className={s.head}>
        <p className="eyebrow">{catalog.round.title}</p>
        <h1 className="h1">All builds</h1>
        <p className="lede">
          Four briefs that cover what developers really ask models for: a marketing site, a product UI, a simulation and a
          game. Each one was given, word for word, to every model.
        </p>
      </header>
      <div className={s.grid2}>
        {tasks.map((t, i) => (
          <TaskCard key={t.slug} task={t} models={models} index={i} />
        ))}
      </div>
    </div>
  );
}
