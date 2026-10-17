import { createHash } from "node:crypto";
import { db, dbConfigured } from "./db";

type ErrInput = {
  source: "server" | "client" | "edge";
  error?: unknown;
  name?: string;
  message?: string;
  stack?: string;
  route?: string;
  severity?: "error" | "warning";
  extra?: Record<string, unknown>;
};

function firstFrame(stack?: string) {
  if (!stack) return "";
  const line = stack.split("\n").find((l) => /^\s*at\s|@/.test(l)) ?? "";
  // Strip line/column numbers and build hashes so the same bug groups together across deploys.
  return line.trim().replace(/:\d+:\d+\)?$/, "").replace(/\?[^\s)]*/, "").replace(/[a-f0-9]{8,}/g, "#").slice(0, 300);
}

export async function recordError(input: ErrInput) {
  const err = input.error as { name?: string; message?: string; stack?: string } | undefined;
  const name = (input.name ?? err?.name ?? "Error").slice(0, 120);
  const message = (input.message ?? err?.message ?? String(input.error ?? "Unknown error")).slice(0, 1000);
  const stack = (input.stack ?? err?.stack ?? "").slice(0, 6000);
  const route = (input.route ?? "").slice(0, 300);
  const frame = firstFrame(stack);
  const fingerprint = createHash("sha256").update(`${input.source}|${name}|${frame || message.slice(0, 120)}|${route}`).digest("hex").slice(0, 32);
  console.error(`[${input.source}] ${name}: ${message}${route ? ` (${route})` : ""}`);
  if (!dbConfigured()) return;
  try {
    await db()`
      insert into error_groups (fingerprint, source, name, message, first_frame, route, severity, sample)
      values (${fingerprint}, ${input.source}, ${name}, ${message}, ${frame}, ${route}, ${input.severity ?? "error"},
              ${JSON.stringify({ stack, ...(input.extra ?? {}) })})
      on conflict (fingerprint) do update set
        count = error_groups.count + 1,
        last_seen = now(),
        message = excluded.message,
        sample = excluded.sample,
        resolved_at = null`;
  } catch (e) {
    // Last resort: the platform log still has it.
    console.error("error inbox write failed", e);
  }
}
