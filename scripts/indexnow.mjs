// Pushes every sitemap URL to IndexNow (Bing, Yandex, Seznam, Naver...). Run after launch and after content changes.
// Usage: node scripts/indexnow.mjs https://glancehall.com
import fs from "node:fs";

const base = (process.argv[2] || "https://glancehall.com").replace(/\/$/, "");
const keyFile = fs.readdirSync("public").find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) throw new Error("no IndexNow key file in public/");
const key = keyFile.replace(".txt", "");
const xml = await (await fetch(`${base}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(base).host, key, keyLocation: `${base}/${keyFile}`, urlList: urls }),
});
console.log(`IndexNow: ${urls.length} URLs → HTTP ${res.status} ${await res.text()}`);
