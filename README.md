# GlanceHall

**We don't rate. We let you see.**

GlanceHall gives the same brief to several AI coding models, lets each one work once, changes nothing, and
publishes what they built side by side: recordings you can watch and the untouched builds you can run.
No scores.

This repository contains the whole thing: the website, the prompts, the runner that drives each model's own
coding agent, and the recorder that turns every build into a comparable video.

## What's inside

| Path | What it is |
| --- | --- |
| `app/`, `components/`, `lib/` | The Next.js website |
| `tasks/<task>/prompt.txt` | The exact prompts every model receives |
| `bench/run.py` | Runs each task against each model in a fresh, empty folder |
| `bench/record/record.mjs` | Records every build with the same scripted session |
| `bench/catalog.py` | Builds `content/catalog.json`, the data the site renders from |
| `db/migrations/` | Postgres schema (subscribers, contact messages, error inbox, rate limits) |

## Run the website locally

Requires Node.js 20.9+ and Python 3.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The site renders from `content/catalog.json`. Videos and live builds are loaded from `NEXT_PUBLIC_MEDIA_BASE`;
to serve your own recordings locally, run `python3 -m http.server 4100 --directory media-out` and keep the
default value.

Forms and the error inbox need Postgres. Set `DATABASE_URL` and run `npm run db:migrate`. Everything else
works without a database.

## Reproduce a round

You need the [Claude Code](https://docs.claude.com/en/docs/claude-code) and [Codex](https://github.com/openai/codex)
CLIs, each signed in.

```bash
python3 bench/run.py                       # every task × every model (takes a while)
python3 bench/run.py --models gpt-6-astra --tasks 03-hexagon-physics
(cd bench/record && npm install) && node bench/record/record.mjs
python3 bench/catalog.py
```

Each run starts in an empty directory outside the repository with a clean environment. Claude Code runs with
`--safe-mode` and Codex with `--ignore-user-config`, so personal instructions, plugins and MCP servers can't
influence the result. Model outputs are copied to `content/runs/` exactly as delivered.

### How recording works

- **Canvas and WebGL tasks** are rendered frame by frame on a virtual clock: the recorder drives
  `requestAnimationFrame`, `performance.now()`, `Date.now()` and timers, seeds `Math.random`, and captures
  60 fps no matter how slow the machine is.
- **Interface tasks** are captured in real time from Chrome's screencast while a fixed script scrolls, hovers,
  clicks and types.

## Environment variables

See `.env.example`. Public values (`NEXT_PUBLIC_*`, `SITE_INDEXABLE`) are needed at build time; the rest are
read at runtime.

## License

Code is released under the MIT license. Model outputs are shown for comparison and commentary; model names and
trademarks belong to their owners.
