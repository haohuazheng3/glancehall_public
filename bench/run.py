#!/usr/bin/env python3
"""Run every task against every model, one fresh empty directory per run.

Each model gets the exact same prompt text, one shot, no follow-ups. Runs happen
in neutral directories outside this repo so no project instruction files can
leak into a model's context, and every CLI starts with a clean environment and
with user customisations disabled.

Usage:
  python3 bench/run.py                      # all tasks x all models
  python3 bench/run.py --models claude-opus-5-5 --tasks 03-hexagon-physics
  python3 bench/run.py --finalize TASK MODEL RUN_DIR --log L --err E --started ISO --exit CODE [--reason R] [--infra]
                                            # persist a run that ended outside the runner (e.g. stopped by hand)
  python3 bench/run.py --reparse TASK MODEL # recompute usage in an existing meta.json from its transcript
Environment:
  CLAUDE_BIN / CODEX_BIN  override the CLI binaries (default: from PATH)
  RUN_TIMEOUT_S           wall-clock limit per attempt (default 150 minutes)

Keep the machine awake while this runs (e.g. `caffeinate -i python3 bench/run.py`): the limit is
measured with time.monotonic(), which does not advance while macOS sleeps.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import secrets
import shutil
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TASKS_DIR = ROOT / "tasks"
OUT_DIR = ROOT / "content" / "runs"
RUNS_TMP = Path(os.environ.get("RUNS_TMP", "/private/tmp/sbs-runs"))
TIMEOUT_S = int(os.environ.get("RUN_TIMEOUT_S", str(150 * 60)))

CLAUDE_BIN = os.environ.get("CLAUDE_BIN") or shutil.which("claude") or "claude"
CODEX_BIN = os.environ.get("CODEX_BIN") or shutil.which("codex") or "codex"

MODELS = {
    "claude-opus-5-5": {"cli": "claude", "model": "claude-opus-5-5", "effort": "max"},
    "claude-fable-5-1": {"cli": "claude", "model": "claude-fable-5-1", "effort": "max"},
    "gpt-6-astra": {"cli": "codex", "model": "gpt-6-astra", "effort": "xhigh"},
    "gpt-6-1-sol": {"cli": "codex", "model": "gpt-6.1-sol", "effort": "xhigh"},
}

# Order of tasks inside one model's queue.
TASK_ORDER = ["03-hexagon-physics", "01-saas-landing", "02-analytics-dashboard", "04-fps-arena"]

# Files we hand to the model; everything else in the run dir afterwards is model output.
PROVIDED = {
    "02-analytics-dashboard": ["data.json"],
    "04-fps-arena": ["assets/three.module.js", "assets/three.core.js"],
}

# Waits between attempts after an infrastructure failure. A subscription's session limit takes hours
# to reset, so the backoff grows instead of hammering the API three times in six minutes.
INFRA_BACKOFF_S = [120, 900, 1800, 3600, 3600]

INFRA_TEXT = re.compile(r"session limit|usage limit|rate limit|overloaded|too many requests", re.I)
INFRA_STDERR = re.compile(r"failed to authenticate|oauth|econnreset|etimedout|enotfound|network error|socket hang up", re.I)

print_lock = threading.Lock()


def log(msg):
    with print_lock:
        print(f"[{dt.datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def clean_env():
    keep = ["HOME", "USER", "LOGNAME", "SHELL", "LANG", "TMPDIR"]
    env = {k: os.environ[k] for k in keep if k in os.environ}
    env["PATH"] = ":".join([
        str(Path(CLAUDE_BIN).parent), str(Path(CODEX_BIN).parent),
        "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin",
    ])
    env["TERM"] = "dumb"
    env.setdefault("LANG", "en_US.UTF-8")
    return env


def cli_version(binary):
    try:
        return subprocess.run([binary, "--version"], capture_output=True, text=True,
                              env=clean_env(), timeout=60).stdout.strip()
    except Exception as e:  # noqa: BLE001 - version is informational only
        return f"unknown ({e})"


def build_cmd(cfg, prompt, run_dir, last_msg):
    if cfg["cli"] == "claude":
        return [CLAUDE_BIN, "-p", prompt, "--safe-mode", "--model", cfg["model"],
                "--effort", cfg["effort"], "--dangerously-skip-permissions",
                "--no-session-persistence", "--output-format", "stream-json", "--verbose"]
    return [CODEX_BIN, "exec", "--ignore-user-config", "--skip-git-repo-check", "--ephemeral",
            "--dangerously-bypass-approvals-and-sandbox", "-m", cfg["model"],
            "-c", f'model_reasoning_effort="{cfg["effort"]}"', "--json",
            "-C", str(run_dir), "-o", str(last_msg), prompt]


def launch(cmd, run_dir, log_path, err_path):
    """Run the CLI under a wall-clock limit that is enforced explicitly, on the whole process group."""
    with open(log_path, "w") as fo, open(err_path, "w") as fe:
        proc = subprocess.Popen(cmd, cwd=run_dir, env=clean_env(), stdout=fo, stderr=fe,
                                stdin=subprocess.DEVNULL, start_new_session=True)
        deadline = time.monotonic() + TIMEOUT_S
        while proc.poll() is None and time.monotonic() < deadline:
            time.sleep(5)
        if proc.poll() is not None:
            return proc.returncode
        log(f"wall-clock limit of {TIMEOUT_S}s reached; stopping process group {proc.pid}")
        for sig, grace in ((signal.SIGTERM, 30), (signal.SIGKILL, 15)):
            try:
                os.killpg(proc.pid, sig)
            except ProcessLookupError:
                break
            try:
                proc.wait(timeout=grace)
                break
            except subprocess.TimeoutExpired:
                continue
        return "timeout"


def read_events(log_path, tail=600):
    try:
        lines = Path(log_path).read_text(errors="replace").splitlines()
    except FileNotFoundError:
        return []
    out = []
    for line in lines[-tail:]:
        try:
            out.append(json.loads(line))
        except ValueError:
            pass
    return out


def parse_usage(cfg, log_path):
    """Pull token usage / turns / cost out of the CLI's JSON event stream."""
    usage = {}
    events = read_events(log_path, tail=10**7)
    if cfg["cli"] == "claude":
        for ev in reversed(events):
            if ev.get("type") == "result":
                u = ev.get("usage") or {}
                usage = {
                    "input_tokens": u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0)
                    + u.get("cache_read_input_tokens", 0),
                    "output_tokens": u.get("output_tokens", 0),
                    "num_turns": ev.get("num_turns"),
                    "api_equivalent_cost_usd": ev.get("total_cost_usd"),
                    "is_error": ev.get("is_error"),
                    "result_subtype": ev.get("subtype"),
                }
                break
        if not usage:
            # No result event (the run was stopped). Input tokens can be rebuilt exactly from the per-message
            # usage (verified against a complete run); output tokens cannot, because streamed events only
            # carry the first few tokens of each message, so they are left unknown rather than guessed.
            per = {}
            for ev in events:
                if ev.get("type") != "assistant":
                    continue
                msg = ev.get("message") or {}
                u = msg.get("usage") or {}
                per[msg.get("id")] = max(per.get(msg.get("id"), 0), u.get("input_tokens", 0)
                                         + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0))
            if per:
                usage = {"input_tokens": sum(per.values()), "output_tokens": None, "num_turns": len(per),
                         "note": "the run was stopped before the CLI reported totals: input tokens are summed "
                                 "from per-message usage, output tokens are unknown"}
    else:
        inp = out = reasoning = turns = 0
        for ev in events:
            if ev.get("type") == "turn.completed":
                u = ev.get("usage") or {}
                inp += u.get("input_tokens", 0)
                out += u.get("output_tokens", 0)
                reasoning += u.get("reasoning_output_tokens", 0)
                turns += 1
            if ev.get("type") == "item.completed" and (ev.get("item") or {}).get("type") == "command_execution":
                usage["commands"] = usage.get("commands", 0) + 1
        usage.update({"input_tokens": inp, "output_tokens": out + reasoning,
                      "reasoning_tokens": reasoning, "turns": turns})
    return usage


def infra_failure(cfg, code, log_path, err_path):
    """(is_infra, reason) from the CLI's structured events, never from raw log text (screenshots
    in the transcript contain any digits you like)."""
    if code in (0, "timeout"):
        return False, None
    reason = None
    events = read_events(log_path)
    if cfg["cli"] == "claude":
        for ev in reversed(events):
            if ev.get("type") == "result":
                text = str(ev.get("result") or "")
                status = ev.get("api_error_status")
                if ev.get("is_error") and (status in (429, 500, 502, 503, 529) or INFRA_TEXT.search(text)):
                    reason = text[:200] or f"API error {status}"
                break
    else:
        for ev in reversed(events):
            if ev.get("type") in ("error", "turn.failed"):
                msg = str(ev.get("message") or (ev.get("error") or {}).get("message") or "")
                if re.search(r"\b(429|500|502|503)\b", msg) or INFRA_TEXT.search(msg):
                    reason = msg[:200]
                break
    if reason is None:
        try:
            err = Path(err_path).read_text(errors="replace")[-3000:]
        except FileNotFoundError:
            err = ""
        m = INFRA_STDERR.search(err)
        if m:
            reason = err[max(0, m.start() - 60):m.end() + 100].strip().replace("\n", " ")[:200]
    return reason is not None, reason


def persist(task, model_key, run_dir, log_path, err_path, last_msg, attempts, started, finished, elapsed, code,
            versions, infra):
    """Copy the model's output (never the files we provided) plus the raw transcript into content/runs."""
    cfg = MODELS[model_key]
    out = OUT_DIR / task / model_key
    run_dir = Path(run_dir)
    provided_names = {Path(rel).name for rel in PROVIDED.get(task, [])}
    for stale in ("files", "transcript.jsonl", "stderr.txt", "final-message.txt", "meta.json"):
        p = out / stale
        if p.is_dir():
            shutil.rmtree(p)
        elif p.exists():
            p.unlink()
    (out / "files").mkdir(parents=True, exist_ok=True)
    for p in run_dir.rglob("*"):
        if p.is_file() and p.name not in provided_names and ".git" not in p.parts and "node_modules" not in p.parts:
            dest = out / "files" / p.relative_to(run_dir)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, dest)
    shutil.copy2(log_path, out / "transcript.jsonl")
    if Path(err_path).exists() and Path(err_path).stat().st_size:
        shutil.copy2(err_path, out / "stderr.txt")
    if Path(last_msg).exists():
        shutil.copy2(last_msg, out / "final-message.txt")
    has_index = (run_dir / "index.html").exists()
    prompt = (TASKS_DIR / task / "prompt.txt").read_text()
    meta = {
        "task": task,
        "model_key": model_key,
        "model": cfg["model"],
        "effort": cfg["effort"],
        "cli": cfg["cli"],
        "cli_version": versions[cfg["cli"]],
        "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
        "started_at": started.isoformat(),
        "finished_at": finished.isoformat(),
        "seconds": elapsed,
        "exit": code,
        # blocked = every attempt died on infrastructure; the model never got to finish, so it is not a failure.
        "status": "ok" if (has_index and not infra) else ("blocked" if infra else "failed"),
        "attempts": attempts,
        "usage": parse_usage(cfg, Path(log_path)),
    }
    (out / "meta.json").write_text(json.dumps(meta, indent=2))
    return meta


def load_prior(task, model_key):
    """Attempts from an earlier invocation that were cut short by infrastructure (kept with their evidence)."""
    prior_path = OUT_DIR / task / model_key / "prior-attempts.json"
    return json.loads(prior_path.read_text()) if prior_path.exists() else []


def run_one(model_key, task, versions):
    cfg = MODELS[model_key]
    task_dir = TASKS_DIR / task
    prompt = (task_dir / "prompt.txt").read_text()
    out = OUT_DIR / task / model_key
    if (out / "meta.json").exists() and json.loads((out / "meta.json").read_text()).get("status") in ("ok", "failed"):
        log(f"skip {task} / {model_key} (already done)")
        return

    prior = load_prior(task, model_key)
    attempts = list(prior)
    max_attempts = 1 + len(INFRA_BACKOFF_S)
    infra = False
    for attempt in range(1, max_attempts + 1):
        run_dir = RUNS_TMP / task / secrets.token_hex(4)
        run_dir.mkdir(parents=True, exist_ok=True)
        for rel in PROVIDED.get(task, []):
            shutil.copy2(task_dir / rel, run_dir / Path(rel).name)

        logs_dir = RUNS_TMP / "_logs" / task
        logs_dir.mkdir(parents=True, exist_ok=True)
        n = len(prior) + attempt
        log_path = logs_dir / f"{model_key}.{n}.jsonl"
        err_path = logs_dir / f"{model_key}.{n}.stderr.txt"
        last_msg = logs_dir / f"{model_key}.{n}.last.txt"

        cmd = build_cmd(cfg, prompt, run_dir, last_msg)
        log(f"start {task} / {model_key} (attempt {n}) in {run_dir}")
        started = dt.datetime.now(dt.timezone.utc)
        t0 = time.monotonic()
        code = launch(cmd, run_dir, log_path, err_path)
        elapsed = round(time.monotonic() - t0, 1)
        finished = dt.datetime.now(dt.timezone.utc)
        has_index = (run_dir / "index.html").exists()
        infra, reason = infra_failure(cfg, code, log_path, err_path)
        attempts.append({"attempt": n, "started_at": started.isoformat(), "exit": code, "seconds": elapsed,
                         "run_dir": str(run_dir), "has_index": has_index, "infra_failure": infra, "reason": reason})
        log(f"done  {task} / {model_key} exit={code} {elapsed}s index={has_index} infra={infra}")

        if infra and attempt < max_attempts:
            wait = INFRA_BACKOFF_S[attempt - 1]
            log(f"infra failure for {task} / {model_key} ({reason}); retrying in {wait}s")
            time.sleep(wait)
            continue
        break

    persist(task, model_key, run_dir, log_path, err_path, last_msg, attempts, started, finished, elapsed, code,
            versions, infra)


def finalize(args):
    """Persist a run that ended outside the runner's control, with the same bookkeeping."""
    cfg = MODELS[args.model]
    versions = {"claude": cli_version(CLAUDE_BIN), "codex": cli_version(CODEX_BIN)}
    started = dt.datetime.fromisoformat(args.started.replace("Z", "+00:00"))
    finished = dt.datetime.now(dt.timezone.utc)
    elapsed = round((finished - started).total_seconds(), 1)
    code = args.exit if args.exit in ("timeout", "stopped") else int(args.exit)
    infra = bool(args.infra)
    reason = args.reason or (infra_failure(cfg, code, Path(args.log), Path(args.err))[1] if not infra else None)
    prior = load_prior(args.task, args.model)
    attempt = {"attempt": len(prior) + 1, "started_at": started.isoformat(), "exit": code, "seconds": elapsed,
               "run_dir": args.run_dir, "has_index": (Path(args.run_dir) / "index.html").exists(),
               "infra_failure": infra, "reason": reason}
    last_msg = Path(args.log).with_suffix("").with_suffix(".last.txt")
    meta = persist(args.task, args.model, args.run_dir, Path(args.log), Path(args.err), last_msg, prior + [attempt],
                   started, finished, elapsed, code, versions, infra)
    log(f"finalized {args.task} / {args.model}: status={meta['status']} seconds={elapsed}")


def reparse(task, model_key):
    """Recompute usage for an existing run from its saved transcript (e.g. after a parser fix)."""
    out = OUT_DIR / task / model_key
    meta = json.loads((out / "meta.json").read_text())
    meta["usage"] = parse_usage(MODELS[model_key], out / "transcript.jsonl")
    (out / "meta.json").write_text(json.dumps(meta, indent=2))
    log(f"reparsed {task} / {model_key}: {meta['usage']}")


def wait_for_claude_auth():
    while True:
        r = subprocess.run([CLAUDE_BIN, "auth", "status"], capture_output=True, text=True, env=clean_env())
        txt = (r.stdout + r.stderr).lower()
        if r.returncode == 0 and "not logged in" not in txt and "expired" not in txt:
            return
        log("waiting for Claude CLI login (run: claude auth login) ...")
        time.sleep(30)


def model_worker(model_key, tasks, versions):
    if MODELS[model_key]["cli"] == "claude":
        wait_for_claude_auth()
    for task in tasks:
        try:
            run_one(model_key, task, versions)
        except Exception as e:  # noqa: BLE001 - keep the queue going, record the failure loudly
            log(f"ERROR {task} / {model_key}: {e!r}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="*", default=list(MODELS))
    ap.add_argument("--tasks", nargs="*", default=TASK_ORDER)
    ap.add_argument("--finalize", nargs=3, metavar=("TASK", "MODEL", "RUN_DIR"))
    ap.add_argument("--reparse", nargs=2, metavar=("TASK", "MODEL"))
    ap.add_argument("--log")
    ap.add_argument("--err")
    ap.add_argument("--started")
    ap.add_argument("--exit", dest="exit")
    ap.add_argument("--reason")
    ap.add_argument("--infra", action="store_true")
    args = ap.parse_args()
    if args.reparse:
        return reparse(*args.reparse)
    if args.finalize:
        args.task, args.model, args.run_dir = args.finalize
        if not (args.log and args.err and args.started and args.exit):
            ap.error("--finalize needs --log, --err, --started and --exit")
        return finalize(args)
    versions = {"claude": cli_version(CLAUDE_BIN), "codex": cli_version(CODEX_BIN)}
    log(f"CLI versions: {versions}")
    threads = [threading.Thread(target=model_worker, args=(m, args.tasks, versions)) for m in args.models]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    log("all runs finished")


if __name__ == "__main__":
    sys.exit(main())
