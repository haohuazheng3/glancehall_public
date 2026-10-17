import type { Metadata } from "next";
import { harnessLabel, models } from "@/lib/catalog";
import { ModelCard } from "@/components/ModelCard";
import s from "../listing.module.css";

export const metadata: Metadata = {
  title: "Models",
  description: "The AI models in the current round, each run with a high reasoning-effort setting through its vendor's own coding agent.",
  alternates: { canonical: "/models" },
};

export default function ModelsPage() {
  return (
    <div className="wrap">
      <header className={s.head}>
        <p className="eyebrow">In this round</p>
        <h1 className="h1">Models</h1>
        <p className="lede">
          Each model runs through its vendor&apos;s own coding agent with a high reasoning-effort setting, and with every
          user customisation switched off.
        </p>
      </header>
      <div className={s.grid4}>
        {models.map((m) => (
          <ModelCard key={m.key} model={m} cli={harnessLabel(m)} />
        ))}
      </div>
    </div>
  );
}
