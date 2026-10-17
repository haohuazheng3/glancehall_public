#!/usr/bin/env python3
"""Run every task against every model, one fresh empty directory per run.

Each model gets the exact same prompt text, one shot, no follow-ups. Runs happen
in neutral directories outside this repo so no project instruction files can
leak into a model's context, and every CLI starts with a
clean environment and with user customisations disabled.

Usage:
  python3 bench/run.py                      # all tasks x all models
  python3 bench/run.py --models claude-opus-5-5 --tasks 03-hexagon-physics
Environment:
  CLAUDE_BIN / CODEX_BIN  override the CLI binaries (default: from PATH)
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import secrets
import shutil
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

INFRA_ERRORS = ("rate limit", "rate_limit", "overloaded", "429", "503", "502", "500 internal",
                "econnreset", "etimedout", "network", "authenticate", "oauth", "usage limit")

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


def parse_usage(cfg, log_path):
    """Pull token usage / turns / cost out of the CLI's JSON event stream."""
    usage = {}
    try:
        lines = log_path.read_text(errors="replace").splitlines()
    except FileNotFoundError:
        return usage
    if cfg["cli"] == "claude":
        for line in reversed(lines):
            try:
                ev = json.loads(line)
            except ValueError:
                continue
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
    else:
        inp = out = reasoning = turns = 0
        for line in lines:
            try:
                ev = json.loads(line)
            except ValueError:
                continue
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


def looks_like_infra_failure(log_path, err_path):
    text = ""
    for p in (log_path, err_path):
        try:
            text += p.read_text(errors="replace")[-6000:].lower()
        except FileNotFoundError:
            pass
    return any(s in text for s in INFRA_ERRORS)


def run_one(model_key, task, versions):
    cfg = MODELS[model_key]
    task_dir = TASKS_DIR / task
    prompt = (task_dir / "prompt.txt").read_text()
    out = OUT_DIR / task / model_key
    if (out / "meta.json").exists() and json.loads((out / "meta.json").read_text()).get("status") == "ok":
        log(f"skip {task} / {model_key} (already done)")
        return

    attempts = []
    for attempt in range(1, 4):
        run_dir = RUNS_TMP / task / secrets.token_hex(4)
        run_dir.mkdir(parents=True, exist_ok=True)
        for rel in PROVIDED.get(task, []):
            shutil.copy2(task_dir / rel, run_dir / Path(rel).name)
        provided_names = {Path(rel).name for rel in PROVIDED.get(task, [])}

        logs_dir = RUNS_TMP / "_logs" / task
        logs_dir.mkdir(parents=True, exist_ok=True)
        log_path = logs_dir / f"{model_key}.{attempt}.jsonl"
        err_path = logs_dir / f"{model_key}.{attempt}.stderr.txt"
        last_msg = logs_dir / f"{model_key}.{attempt}.last.txt"

        cmd = build_cmd(cfg, prompt, run_dir, last_msg)
        log(f"start {task} / {model_key} (attempt {attempt}) in {run_dir}")
        started = dt.datetime.now(dt.timezone.utc)
        t0 = time.monotonic()
        with open(log_path, "w") as fo, open(err_path, "w") as fe:
            try:
                proc = subprocess.run(cmd, cwd=run_dir, env=clean_env(), stdout=fo, stderr=fe,
                                      stdin=subprocess.DEVNULL, timeout=TIMEOUT_S)
                code = proc.returncode
            except subprocess.TimeoutExpired:
                code = "timeout"
        elapsed = round(time.monotonic() - t0, 1)
        finished = dt.datetime.now(dt.timezone.utc)
        has_index = (run_dir / "index.html").exists()
        attempts.append({"attempt": attempt, "exit": code, "seconds": elapsed, "run_dir": str(run_dir),
                         "has_index": has_index})
        log(f"done  {task} / {model_key} exit={code} {elapsed}s index={has_index}")

        if not has_index and code != "timeout" and looks_like_infra_failure(log_path, err_path) and attempt < 3:
            log(f"infra failure suspected for {task} / {model_key}; retrying in 120s")
            time.sleep(120)
            continue
        break

    # Persist the model's output (never the files we provided) plus the raw transcript.
    if out.exists():
        shutil.rmtree(out)
    (out / "files").mkdir(parents=True)
    for p in run_dir.rglob("*"):
        if p.is_file() and p.name not in provided_names and ".git" not in p.parts and "node_modules" not in p.parts:
            dest = out / "files" / p.relative_to(run_dir)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, dest)
    shutil.copy2(log_path, out / "transcript.jsonl")
    if err_path.stat().st_size:
        shutil.copy2(err_path, out / "stderr.txt")
    if last_msg.exists():
        shutil.copy2(last_msg, out / "final-message.txt")

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
        "status": "ok" if has_index else "failed",
        "attempts": attempts,
        "usage": parse_usage(cfg, log_path),
    }
    (out / "meta.json").write_text(json.dumps(meta, indent=2))


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
    args = ap.parse_args()
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
