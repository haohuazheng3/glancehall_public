import type { Metadata } from "next";
import { briefNouns, catalog, listJoin, models, numberWord, tasks } from "@/lib/catalog";
import { TaskCard } from "@/components/TaskCard";
import s from "../listing.module.css";

export const metadata: Metadata = {
  title: "All builds",
  description: `Every brief in the current round: ${listJoin(briefNouns())}, each built by Claude and GPT from the same prompt.`,
  alternates: { canonical: "/tasks" },
};

export default function TasksPage() {
  return (
    <div className="wrap">
      <header className={s.head}>
        <p className="eyebrow">{catalog.round.title}</p>
        <h1 className="h1">All builds</h1>
        <p className="lede">
          {numberWord(tasks.length, true)} briefs that cover what developers really ask models for, from {briefNouns()[0]} to{" "}
          {briefNouns()[tasks.length - 1]}. Each one was given, word for word, to every model.
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
