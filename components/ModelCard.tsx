import Link from "next/link";
import type { Model } from "@/lib/catalog";
import { Arrow } from "./Stage";
import s from "./ModelCard.module.css";

export function ModelCard({ model, cli }: { model: Model; cli?: string }) {
  return (
    <Link href={`/models/${model.key}`} className={`module lift ${s.card} m-${model.accent}`}>
      <span className={s.glow} aria-hidden="true" />
      <span className="eyebrow">{model.vendor}</span>
      <h3 className={s.name}>{model.name}</h3>
      <dl className={s.facts}>
        <div>
          <dt>Effort</dt>
          <dd>{model.effortLabel}</dd>
        </div>
        <div>
          <dt>Harness</dt>
          <dd>{cli ?? model.harness}</dd>
        </div>
      </dl>
      <span className={s.more}>
        Watch its builds <Arrow />
      </span>
    </Link>
  );
}
