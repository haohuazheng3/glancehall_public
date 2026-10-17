// Uploads media-out/<round>/** (videos, posters, live builds) to the R2 media bucket with correct
// content types and immutable caching. Skips files whose size+mtime haven't changed since the last upload.
//
// Env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, R2_BUCKET
// Usage: node scripts/publish-media.mjs [--round r01] [--force]
import fs from "node:fs";
import path from "node:path";

const { CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT, R2_BUCKET: BUCKET } = process.env;
if (!TOKEN || !ACCOUNT || !BUCKET) {
  console.error("Set CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID and R2_BUCKET");
  process.exit(1);
}
const args = process.argv.slice(2);
const ROUND = args.includes("--round") ? args[args.indexOf("--round") + 1] : "r01";
const FORCE = args.includes("--force");
const ROOT = path.join(process.cwd(), "media-out");
const LEDGER = path.join(ROOT, `.uploaded-${BUCKET}.json`);

const TYPES = {
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name.startsWith(".") ? [] : [p];
  });
}

const ledger = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, "utf8")) : {};
const files = walk(path.join(ROOT, ROUND));
const todo = files.filter((f) => {
  const st = fs.statSync(f);
  const key = path.relative(ROOT, f).split(path.sep).join("/");
  return FORCE || ledger[key] !== `${st.size}:${Math.round(st.mtimeMs)}`;
});
console.log(`${files.length} files, ${todo.length} to upload → r2://${BUCKET}`);

async function put(file) {
  const key = path.relative(ROOT, file).split(path.sep).join("/");
  const ext = path.extname(file).toLowerCase();
  // Builds can be re-published, so they revalidate; recordings are content-addressed by round and stay immutable.
  const isBuild = key.includes("/build/");
  const headers = {
    authorization: `Bearer ${TOKEN}`,
    "content-type": TYPES[ext] || "application/octet-stream",
    "cache-control": isBuild ? "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" : "public, max-age=31536000, immutable",
  };
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/r2/buckets/${BUCKET}/objects/${key.split("/").map(encodeURIComponent).join("/")}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { method: "PUT", headers, body: fs.readFileSync(file) });
    if (res.ok) {
      const st = fs.statSync(file);
      ledger[key] = `${st.size}:${Math.round(st.mtimeMs)}`;
      return;
    }
    const text = await res.text();
    if (attempt === 4 || (res.status < 500 && res.status !== 429)) throw new Error(`${key}: HTTP ${res.status} ${text.slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, attempt * 1500));
  }
}

let done = 0;
const queue = [...todo];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const f = queue.shift();
      await put(f);
      if (++done % 20 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}`);
    }
  })
);
fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 1));
console.log("upload complete");
