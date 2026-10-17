// Builds the public file set from .public-allowlist and enforces three gates:
//   1. allowlist ∩ hard-exclusions → explicit file list (printed)
//   2. the only Markdown file allowed is the root README.md
//   3. no file may contain secrets, private identifiers or references to internal notes
// Usage: node scripts/public-gate.mjs [--out <dir>]   (exit 1 on any violation)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const outIdx = process.argv.indexOf("--out");
const OUT = outIdx > -1 ? path.resolve(process.argv[outIdx + 1]) : null;

function globToRegex(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      re += ".*";
      i++;
      if (glob[i + 1] === "/") i++;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

const allow = fs
  .readFileSync(path.join(ROOT, ".public-allowlist"), "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map(globToRegex);

// Second line of defence: never published even if an allowlist pattern matches.
const HARD_EXCLUDE = [
  /(^|\/)\.env(\..*)?$/,
  /^\.github\//,
  /^\.public-allowlist$/,
  /^\.claude\//,
  /^(ops-reports|docs|\.flow|logs|account|accounts|internal|notes)\//,
  /^content\/runs\//,
  /^content\/blog\//,
  /^media-out\//,
];
const EXAMPLE_ENV = /^\.env\.example$/;

const SECRET_PATTERNS = [
  [/\bsk-[A-Za-z0-9_-]{16,}/, "OpenAI/Anthropic-style secret key"],
  [/\b(sk|rk)_live_[A-Za-z0-9]{8,}/, "Stripe live key"],
  [/\bfw_sk_[A-Za-z0-9]{8,}/, "FlowGlance account key"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, "GitHub token"],
  [/postgres(ql)?:\/\/[^\s'"]+:[^\s'"]+@/, "database URL with credentials"],
  [/@haohuaz/i, "private identifier"],
  [/futureripple/i, "private identifier"],
  [/haohuazheng001/i, "private email"],
  [/haohua\.work@/i, "private email"],
  [/\b(CLAUDE|seo|gsc|account|dofollow|nofollow|advices|insights)\.md\b/, "reference to an internal note"],
];

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" }).split("\0").filter(Boolean);
const files = tracked.filter((f) => allow.some((re) => re.test(f)) && (EXAMPLE_ENV.test(f) || !HARD_EXCLUDE.some((re) => re.test(f))));

const problems = [];
// Gate 2: Markdown
for (const f of files) if (/\.(md|mdx|markdown)$/i.test(f) && f !== "README.md") problems.push(`${f}: only README.md may be public`);
// Gate 3: content scan
for (const f of files) {
  const buf = fs.readFileSync(path.join(ROOT, f));
  if (buf.includes(0)) continue; // binary
  const text = buf.toString("utf8");
  if (f === "scripts/public-gate.mjs") continue; // contains the patterns themselves
  for (const [re, label] of SECRET_PATTERNS) if (re.test(text)) problems.push(`${f}: ${label}`);
}

console.log(`public set: ${files.length} files`);
for (const f of files) console.log(`  + ${f}`);
if (problems.length) {
  console.error(`\nBLOCKED: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
if (!files.includes("README.md")) {
  console.error("BLOCKED: README.md is missing from the public set");
  process.exit(1);
}
if (OUT) {
  fs.rmSync(OUT, { recursive: true, force: true });
  for (const f of files) {
    const dest = path.join(OUT, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), dest);
  }
  console.log(`copied to ${OUT}`);
}
console.log("gates passed");
