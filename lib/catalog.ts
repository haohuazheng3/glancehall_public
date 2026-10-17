import data from "@/content/catalog.json";

export type ViewKind = "desktop" | "mobile";

export type MediaVariant = {
  mp4?: string;
  preview?: string;
  poster?: string;
  posterSmall?: string;
  seconds?: number;
  width?: number;
  height?: number;
  bytes?: number;
};

export type Run = {
  status: "ok" | "failed" | "pending";
  seconds?: number;
  startedAt?: string;
  finishedAt?: string;
  cliVersion?: string;
  attempts?: number;
  inputTokens?: number;
  outputTokens?: number;
  turns?: number;
  files?: string[];
  sourceBytes?: number;
  artifact?: string | null;
  media?: Partial<Record<ViewKind, MediaVariant>>;
  runtime?: { consoleErrors?: string[]; pageErrors?: string[]; notes?: string[]; note?: string } | null;
};

export type Model = {
  key: string;
  name: string;
  vendor: string;
  family: string;
  model_id: string;
  effort: string;
  effortLabel: string;
  harness: string;
  accent: string;
};

export type Task = {
  slug: string;
  dir: string;
  order: number;
  title: string;
  category: string;
  summary: string;
  watchFor: string[];
  views: ViewKind[];
  interaction: string;
  prompt: string;
  runs: Record<string, Run>;
};

export type Catalog = {
  round: { id: string; title: string; date: string };
  models: Model[];
  tasks: Task[];
};

export const catalog = data as unknown as Catalog;

export const models = catalog.models;
export const tasks = catalog.tasks;

export function getTask(slug: string) {
  return tasks.find((t) => t.slug === slug);
}

export function getModel(key: string) {
  return models.find((m) => m.key === key);
}

export function pairSlug(a: string, b: string) {
  return `${a}-vs-${b}`;
}

// All unordered model pairs, in catalog order, for /compare pages.
export function allPairs() {
  const out: [Model, Model][] = [];
  for (let i = 0; i < models.length; i++)
    for (let j = i + 1; j < models.length; j++) out.push([models[i], models[j]]);
  return out;
}

export function parsePair(slug: string): [Model, Model] | null {
  for (const [a, b] of allPairs()) {
    if (slug === pairSlug(a.key, b.key)) return [a, b];
  }
  return null;
}

export function formatDuration(s?: number) {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return m ? `${m}m ${sec.toString().padStart(2, "0")}s` : `${sec}s`;
}

export function formatTokens(n?: number) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

// "Claude Code 2.1.302" / "Codex CLI 0.163.0", from whatever version string the run recorded.
export function harnessLabel(model: Model) {
  for (const t of tasks) {
    const v = t.runs[model.key]?.cliVersion?.match(/\d+\.\d+\.\d+/)?.[0];
    if (v) return `${model.harness} ${v}`;
  }
  return model.harness;
}
