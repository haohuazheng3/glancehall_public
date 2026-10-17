// Applies db/migrations/*.sql in order, once each. Safe to re-run.
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = neon(url);
const dir = path.join(process.cwd(), "db", "migrations");
await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
const done = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(file)) {
    console.log(`skip ${file}`);
    continue;
  }
  const body = fs.readFileSync(path.join(dir, file), "utf8");
  // neon() runs one statement per call; split on semicolons at line ends.
  const statements = body
    .split(/;\s*$/m)
    .map((s) => s.replace(/--.*$/gm, "").trim())
    .filter(Boolean);
  await sql.transaction(statements.map((s) => sql.query(s)));
  await sql`insert into schema_migrations (name) values (${file})`;
  console.log(`applied ${file} (${statements.length} statements)`);
}
