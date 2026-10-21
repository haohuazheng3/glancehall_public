import Link from "next/link";
import { catalog, harnessLabel, listJoin, models, numberWord, tasks } from "@/lib/catalog";
import { Stage, Arrow } from "@/components/Stage";
import { TaskCard } from "@/components/TaskCard";
import { ModelCard } from "@/components/ModelCard";
import { SubscribeForm } from "@/components/SubscribeForm";
import s from "./home.module.css";

const RULES = [
  { n: "01", t: "Same prompt, word for word", d: "Every model gets the identical brief. It is printed on every build page, so you can check." },
  { n: "02", t: "One shot, no retries", d: "No follow-up messages and no best-of-five. The first thing a model delivers is what you see." },
  { n: "03", t: "Nothing edited", d: "We don't fix bugs, restyle or trim. Broken builds stay broken, with their console errors listed." },
  { n: "04", t: "Recorded the same way", d: "A script performs identical scrolls, clicks and keystrokes on every build before you watch it." },
];

export default function Home() {
  const date = new Date(catalog.round.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return (
    <>
      <section className={`wrap ${s.hero}`}>
        <Link href="/tasks" className={s.pill}>
          <span className={s.live} aria-hidden="true" />
          {catalog.round.title} · Claude vs GPT · {date}
          <Arrow />
        </Link>
        <h1 className={`display ${s.title}`}>
          We don&apos;t rate.
          <br />
          We let you <em>see</em>.
        </h1>
        <p className={`lede ${s.lede}`}>
          Leaderboards hand you a number. We hand you the work. Every model gets the same brief, one attempt and no
          human fixes, and we record exactly what it built. You decide what&apos;s better.
        </p>
        <div className={s.ctas}>
          <Link href="#stage" className="btn btn-primary">
            Watch the builds
          </Link>
          <Link href="/methodology" className="btn btn-ghost">
            How we test
          </Link>
        </div>
      </section>

      <section id="stage" className={`wrap ${s.stageWrap}`} aria-label="All four models, playing side by side">
        <Stage tasks={tasks} models={models} initial={tasks.find((t) => t.slug === "first-person-shooter")?.slug} />
      </section>

      <section className="wrap section" aria-labelledby="rules-h">
        <div className={s.secHead}>
          <p className="eyebrow">The rules</p>
          <h2 id="rules-h" className="h2">
            Fair is boring. That&apos;s the point.
          </h2>
        </div>
        <div className={s.rules}>
          {RULES.map((r) => (
            <div key={r.n} className={`module ${s.rule}`}>
              <span className={`mono ${s.ruleN}`}>{r.n}</span>
              <h3 className="h3">{r.t}</h3>
              <p className="muted">{r.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap section" aria-labelledby="builds-h">
        <div className={s.secHead}>
          <p className="eyebrow">{catalog.round.title}</p>
          <h2 id="builds-h" className="h2">
            {numberWord(tasks.length, true)} briefs. {numberWord(models.length, true)} models. {numberWord(tasks.length * models.length, true)} builds.
          </h2>
          <p className="lede">
            {listJoin(tasks.map((t) => t.category))}: the work developers actually ask models to do.
          </p>
        </div>
        <div className={s.tasks}>
          {tasks.map((t, i) => (
            <TaskCard key={t.slug} task={t} models={models} index={i} />
          ))}
        </div>
      </section>

      <section className="wrap section" aria-labelledby="blind-h">
        <div className={`module ${s.blind}`}>
          <div className={s.blindText}>
            <p className="eyebrow">Blind mode</p>
            <h2 id="blind-h" className="h2">
              Names change what you see.
            </h2>
            <p className="lede">
              Turn on blind mode and the builds become A, B, C and D. Pick the one you would ship, then reveal who made
              it. Your pick stays in your browser; we don&apos;t count votes.
            </p>
            <Link href="/tasks/saas-landing-page?blind=1" className="btn btn-primary">
              Try it blind
            </Link>
          </div>
          <div className={s.blindArt} aria-hidden="true">
            {["A", "B", "C", "D"].map((l, i) => (
              <div key={l} className={s.blindCard} style={{ ["--i" as string]: i }}>
                <span className={s.blindLetter}>{l}</span>
                <span className={s.blindQ}>?</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap section" aria-labelledby="models-h">
        <div className={s.secHead}>
          <p className="eyebrow">In this round</p>
          <h2 id="models-h" className="h2">
            Each model through its own agent.
          </h2>
        </div>
        <div className={s.models}>
          {models.map((m) => (
            <ModelCard key={m.key} model={m} cli={harnessLabel(m)} />
          ))}
        </div>
      </section>

      <section className="wrap section" aria-labelledby="why-h">
        <div className={s.why}>
          <p className="eyebrow">Why no scores</p>
          <h2 id="why-h" className={s.whyQuote}>
            A score compresses a thousand design decisions into one number. It can&apos;t tell you that the pricing toggle
            doesn&apos;t toggle, or that the game is complete but dull. <em>You can only see that.</em>
          </h2>
        </div>
      </section>

      <section id="subscribe" className="wrap section" aria-labelledby="sub-h">
        <div className={`module ${s.sub}`}>
          <div>
            <p className="eyebrow">Next round</p>
            <h2 id="sub-h" className="h2">
              New models ship every few weeks.
            </h2>
            <p className="lede">We run the same briefs on them. One email when the next round is live, nothing else.</p>
          </div>
          <SubscribeForm source="home" />
        </div>
      </section>
    </>
  );
}
