import type { Metadata } from "next";
import Link from "next/link";
import { DocPage } from "@/components/DocPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${SITE.name} shows what AI models actually build, side by side and unedited, instead of ranking them with a score.`,
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <DocPage eyebrow="About" title={`Why ${SITE.name} exists`} intro="Because choosing a model by a number you can't see behind is a strange way to choose a tool you'll look at all day.">
      <p>
        Every week a new model tops a leaderboard. The scores are real, but they answer a question most developers aren&apos;t
        asking. When you pick between Claude and GPT for your next project, you want to know what each one will{" "}
        <em>make</em>: whether its landing page looks designed or assembled, whether its dashboard handles the edge cases,
        whether its game is fun or merely complete.
      </p>
      <p>
        {SITE.name} answers that the only honest way we know: give every model the same brief, let it work once, change
        nothing, and put the results next to each other. Then get out of the way.
      </p>
      <h2>What we promise</h2>
      <ul>
        <li>
          <strong>No scores.</strong> Not hidden ones, not &quot;editor&apos;s picks&quot;. The facts we show (time, size,
          errors) are measurements, never rankings.
        </li>
        <li>
          <strong>No edits.</strong> What a model delivered is what you see, bugs included.
        </li>
        <li>
          <strong>No vendor money.</strong> {SITE.name} is independent. It isn&apos;t affiliated with, sponsored by or paid by
          Anthropic, OpenAI or any other model vendor. If that ever changes, it will say so on every page it affects.
        </li>
        <li>
          <strong>Everything reproducible.</strong> Prompts, commands, settings and recording scripts are published.{" "}
          <Link href="/methodology">See how we test.</Link>
        </li>
      </ul>
      <h2>What&apos;s next</h2>
      <p>
        Round 01 covers two Claude models and two GPT models. Next rounds add more vendors and more kinds of work. If there&apos;s
        a brief you&apos;d like to see, or a model we should add, <Link href="/contact">tell us</Link>.
      </p>
    </DocPage>
  );
}
