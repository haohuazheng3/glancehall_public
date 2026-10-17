import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

export function dbConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

// Pooled Neon connection string over HTTP: no sockets to exhaust under serverless load.
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  client ??= neon(process.env.DATABASE_URL);
  return client;
}
