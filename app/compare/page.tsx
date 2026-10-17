import type { Metadata } from "next";
import Link from "next/link";
import { allPairs, pairSlug } from "@/lib/catalog";
import { Arrow } from "@/components/Stage";
import s from "../listing.module.css";
import c from "./compare.module.css";

export const metadata: Metadata = {
  title: "Head to head",
  description: "Pick any two models and watch their builds side by side: Claude Opus 5.5, Claude Fable 5.1, GPT-6 Astra and GPT-6.1 Sol on the same four briefs.",
  alternates: { canonical: "/compare" },
};

export default function ComparePage() {
  return (
    <div className="wrap">
      <header className={s.head}>
        <p className="eyebrow">Head to head</p>
        <h1 className="h1">Pick two. Watch them build.</h1>
        <p className="lede">Every pairing in the round, with all four briefs side by side on one page.</p>
      </header>
      <div className={s.grid3}>
        {allPairs().map(([a, b]) => (
          <Link key={pairSlug(a.key, b.key)} href={`/compare/${pairSlug(a.key, b.key)}`} className={`module lift ${c.pair}`}>
            <span className={`${c.side} m-${a.accent}`}>
              <span className="m-dot" />
              {a.name}
            </span>
            <span className={c.vs}>vs</span>
            <span className={`${c.side} m-${b.accent}`}>
              <span className="m-dot" />
              {b.name}
            </span>
            <span className={c.go}>
              Watch <Arrow />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
