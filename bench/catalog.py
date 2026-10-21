#!/usr/bin/env python3
"""Build content/catalog.json: the single data file the website renders from.

Inputs
  tasks/<dir>/task.json + prompt.txt     editorial facts + the exact prompt
  bench/models.json                      model display facts
  content/runs/<dir>/<model>/meta.json   what happened in each run (bench/run.py)
  content/media-manifest.json            which videos/posters exist (bench/record)
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ROUND = {"id": "r01", "title": "Round 01", "date": "2026-10-21"}


def load(p, default=None):
    try:
        return json.loads(Path(p).read_text())
    except FileNotFoundError:
        return default


def main():
    models = load(ROOT / "bench" / "models.json")
    manifest = load(ROOT / "content" / "media-manifest.json", {}) or {}
    tasks = []
    for tdir in sorted((ROOT / "tasks").iterdir()):
        tj = tdir / "task.json"
        if not tj.exists():
            continue
        task = load(tj)
        if task.get("draft"):
            # Still being built or recorded: kept off the site until every model's build is in.
            continue
        task["dir"] = tdir.name
        task["prompt"] = (tdir / "prompt.txt").read_text().strip()
        runs = {}
        for m in models:
            meta = load(ROOT / "content" / "runs" / tdir.name / m["key"] / "meta.json")
            media = manifest.get(task["slug"], {}).get(m["key"], {})
            if not meta:
                runs[m["key"]] = {"status": "pending"}
                continue
            files_dir = ROOT / "content" / "runs" / tdir.name / m["key"] / "files"
            files = sorted(str(p.relative_to(files_dir)) for p in files_dir.rglob("*") if p.is_file()) if files_dir.exists() else []
            u = meta.get("usage") or {}
            attempts = meta.get("attempts") or []
            # blocked = every attempt so far died on infrastructure (rate limit, outage); the model never finished.
            blocked = meta.get("status") == "blocked"
            runs[m["key"]] = {
                "status": "pending" if blocked else meta.get("status"),
                "blocked": blocked,
                "seconds": meta.get("seconds"),
                "startedAt": meta.get("started_at"),
                "finishedAt": meta.get("finished_at"),
                "cliVersion": meta.get("cli_version"),
                "attempts": len(attempts),
                "attemptNotes": [
                    f"Attempt {a.get('attempt')}: {a.get('reason')}" if a.get("infra_failure")
                    else f"Attempt {a.get('attempt')}: stopped at the 150-minute limit; the files on disk at that moment are what is published."
                    for a in attempts if a.get("infra_failure") or a.get("exit") == "timeout"
                ],
                "inputTokens": u.get("input_tokens"),
                "outputTokens": u.get("output_tokens"),
                "turns": u.get("num_turns") or u.get("turns"),
                "files": files,
                "sourceBytes": sum((files_dir / f).stat().st_size for f in files) if files else 0,
                "artifact": f"{ROUND['id']}/{task['slug']}/{m['key']}/build/index.html" if meta.get("status") == "ok" else None,
                "media": media.get("media", {}),
                "runtime": media.get("runtime"),  # null until the build has been recorded
            }
        task["runs"] = runs
        tasks.append(task)
    tasks.sort(key=lambda t: t["order"])
    out = {"round": ROUND, "models": models, "tasks": tasks}
    (ROOT / "content" / "catalog.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    done = sum(1 for t in tasks for r in t["runs"].values() if r["status"] != "pending")
    print(f"catalog: {len(tasks)} tasks, {len(models)} models, {done} runs recorded")


if __name__ == "__main__":
    main()
