import type { Metadata } from "next";
import Link from "next/link";
import { harnessLabel, listJoin, models, numberWord, tasks } from "@/lib/catalog";
import { DocPage } from "@/components/DocPage";

export const metadata: Metadata = {
  title: "How we test",
  description: "Exactly how every build is produced and recorded: the same prompt, one shot, a clean agent session, no human edits, and an identical scripted recording for every model.",
  alternates: { canonical: "/methodology" },
};

export default function Methodology() {
  const claude = models.find((m) => m.harness === "Claude Code");
  const gpt = models.find((m) => m.harness === "Codex CLI");
  return (
    <DocPage
      eyebrow="Method"
      title="How we test"
      intro="Everything that could tilt the result is either held fixed or published. If you think something here is unfair, tell us and we'll change it in the open."
      updated="October 17, 2026"
    >
      <h2>The short version</h2>
      <ul>
        <li>Every model gets the identical prompt, word for word. It is printed on every build page.</li>
        <li>One attempt each. No follow-up messages, no &quot;try again&quot;, no picking the best of several runs.</li>
        <li>Each run starts in a fresh, empty folder with a clean environment and every user customisation switched off.</li>
        <li>Nothing the model delivers is edited. Broken builds are published broken, with their errors.</li>
        <li>A script records every build with the same scrolls, clicks and keystrokes. You can also open every build live.</li>
        <li>We never turn any of this into a score.</li>
      </ul>

      <h2>The briefs</h2>
      <p>
        Round 01 has {numberWord(tasks.length)} briefs ({listJoin(tasks.map((t) => t.category.toLowerCase()))}) chosen to
        cover the work developers most often hand to a model. Each brief fixes the content (product name, copy facts, prices,
        the dataset, the controls) so the differences you see come from how well each model executes, not from what it
        decided to make. The one exception is the open brief, which fixes nothing on purpose.
      </p>
      <p>
        Builds must be a single <code>index.html</code> with no build step (games may add local script files), so anyone
        can open them years from now. Network access at runtime is limited to Google Fonts for the interface briefs, and to
        nothing at all for the simulation and the games. The 3D game briefs ship three.js r186 as a local file so every model
        has the same engine.
      </p>

      <h2>How each model is run</h2>
      <p>
        Each model runs inside its vendor&apos;s own coding agent, the way developers actually use it, with the reasoning
        effort shown below. The agent may run its own commands while it works (for example to open its page in a browser and
        check it); every agent has the same freedom.
      </p>
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Effort</th>
            <th>Harness</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.key}>
              <td>{m.name}</td>
              <td>{m.effortLabel}</td>
              <td>{harnessLabel(m)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>The exact commands, with the prompt passed as the argument:</p>
      <pre>{`# ${claude?.name ?? "Claude"} (and every Claude model)
claude -p "<prompt>" --safe-mode --model ${claude?.model_id ?? "claude-opus-5-5"} --effort max \\
  --dangerously-skip-permissions --no-session-persistence \\
  --output-format stream-json --verbose

# ${gpt?.name ?? "GPT"} (and every GPT model)
codex exec --ignore-user-config --skip-git-repo-check --ephemeral \\
  --dangerously-bypass-approvals-and-sandbox \\
  -m ${gpt?.model_id ?? "gpt-6.1-sol"} -c model_reasoning_effort="xhigh" --json "<prompt>"`}</pre>
      <p>
        <code>--safe-mode</code> and <code>--ignore-user-config</code> switch off personal instruction files, plugins, MCP
        servers and hooks, so each agent starts with only its built-in tools. Every attempt has the same wall-clock limit
        of 150 minutes of running time; a model still working at that point is stopped, and whatever it has on disk is
        published and flagged on the build. Runs happen in neutral folders outside any
        project, so no repository instructions can leak in. The only retry we allow is for an infrastructure failure (a rate
        limit or an outage) that stopped a run before the model finished. When that happens, the interrupted attempt is
        listed on the build with its reason, and whatever it left on disk is kept as evidence but never published.
      </p>

      <h2>How the videos are recorded</h2>
      <p>
        <strong>Simulation and game.</strong> These are rendered frame by frame on a virtual clock: the recorder controls
        <code> requestAnimationFrame</code>, <code>performance.now()</code>, <code>Date.now()</code> and timers, and captures
        each frame at 60 fps. A slow recording machine can never make one model look choppier than another. Randomness is seeded
        identically for every build. In the games, the same input script is played into every build after pressing Play (40
        seconds of moving, turning, firing and reloading in the shooter; 60 seconds of clicking up the lane and casting
        abilities in the MOBA); if a build reaches its end screen, the recorder presses the restart button.
      </p>
      <p>
        <strong>Website and dashboard.</strong> These are captured in real time from Chrome at 1440×900 and on a 390×844 phone
        viewport, while a script scrolls at a fixed speed and uses the controls the brief asked for: the Yearly toggle, an FAQ
        question, chart hover, table sorting, filters, pagination, search, dark mode, drag and drop, and the send-money flow
        in the phone app. A small circle shows where the script
        is pointing. If a control the brief required can&apos;t be found, that is noted on the build rather than worked around.
      </p>
      <p>
        A video can&apos;t carry sound, game feel or how an interface responds to your own hands. That&apos;s why every build
        has an <strong>Open live</strong> button.
      </p>

      <h2>How builds are published</h2>
      <p>
        The files each model delivered are published byte for byte. They run from a separate origin inside a sandboxed frame, so
        model-written code never runs with this site&apos;s privileges. Agent transcripts are kept as evidence. Errors the
        browser reported during recording are listed under each build.
      </p>

      <h2>Limits we know about</h2>
      <ul>
        <li>
          <strong>One sample.</strong> Models are not deterministic; a second run could come out better or worse. We show the
          first attempt because that is what you get when you ask.
        </li>
        <li>
          <strong>The harness matters.</strong> You are seeing each model through its own agent. That is the comparison most
          developers face, but it is a model-plus-agent comparison, not a raw model one.
        </li>
        <li>
          <strong>Time and tokens are context, not merit.</strong> Build time depends on server load. Token counts come from
          each CLI and use different tokenizers.
        </li>
        <li>
          <strong>English prompts, browser builds.</strong> Results may differ for other languages and other platforms.
        </li>
      </ul>

      <h2>Run it yourself</h2>
      <p>
        Every prompt is on its build page with a copy button, and the commands are above. If your results look very different
        from ours, we&apos;d genuinely like to hear about it: <Link href="/contact">get in touch</Link>.
      </p>
    </DocPage>
  );
}
