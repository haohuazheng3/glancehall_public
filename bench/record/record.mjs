// Records every run with the same scripted session so the videos are directly comparable.
//
//  * Canvas/WebGL tasks (simulation, game) are rendered frame by frame on a virtual clock:
//    requestAnimationFrame, performance.now, Date.now and timers are driven by the recorder,
//    so every model gets a perfectly smooth 60 fps video no matter how slow capture is.
//  * UI tasks (landing page, dashboard) are captured in real time from Chrome's screencast
//    while a fixed script scrolls, hovers, clicks and types.
//
// Usage: node bench/record/record.mjs [--task <slug>] [--model <key>] [--force]
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ROUND = "r01";
const OUT = path.join(ROOT, "media-out", ROUND);
const MANIFEST = path.join(ROOT, "content", "media-manifest.json");
const FRAMES_ROOT = path.join(ROOT, "bench", "record", ".frames");

const args = process.argv.slice(2);
const argVal = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const ONLY_TASK = argVal("--task");
const ONLY_MODEL = argVal("--model");
const FORCE = args.includes("--force");

const models = JSON.parse(fs.readFileSync(path.join(ROOT, "bench/models.json"), "utf8"));
const tasks = fs
  .readdirSync(path.join(ROOT, "tasks"))
  .filter((d) => fs.existsSync(path.join(ROOT, "tasks", d, "task.json")))
  .map((d) => ({ dir: d, ...JSON.parse(fs.readFileSync(path.join(ROOT, "tasks", d, "task.json"), "utf8")) }));

// Files we handed to the model that the build needs at runtime.
const PROVIDED = { "04-fps-arena": ["assets/three.module.js", "assets/three.core.js"] };

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

// ---------------------------------------------------------------- helpers

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(...a) {
  console.log(new Date().toTimeString().slice(0, 8), ...a);
}

function ffmpeg(argv) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...argv], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${argv.join(" ")}`);
}

function probeSeconds(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  return Math.round(parseFloat(r.stdout) * 10) / 10;
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  } catch {
    return {};
  }
}

function writeManifest(m) {
  fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 1) + "\n");
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8",
};

function serve(dir) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let f = path.join(dir, u);
      if (!f.startsWith(dir)) return res.writeHead(403).end();
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
      if (!fs.existsSync(f)) return res.writeHead(404).end("not found");
      res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, "127.0.0.1", () => resolve({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() }));
  });
}

// Copy the model's output plus any provided runtime files into the publishable build folder.
function stageBuild(task, model) {
  const src = path.join(ROOT, "content/runs", task.dir, model.key, "files");
  const dst = path.join(OUT, task.slug, model.key, "build");
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
  for (const rel of PROVIDED[task.dir] || []) fs.copyFileSync(path.join(ROOT, "tasks", task.dir, rel), path.join(dst, path.basename(rel)));
  return dst;
}

// ---------------------------------------------------------------- injected page scripts

// Virtual clock + seeded Math.random + pointer-lock emulation (headless has no real pointer lock).
const VIRTUAL_TIME = `(() => {
  const realSetTimeout = window.setTimeout.bind(window);
  const realRAF = window.requestAnimationFrame.bind(window);
  let now = 0;
  const t0 = Date.now();
  let rafQ = new Map(), rafId = 0;
  const timers = new Map();
  let timerId = 0;
  let s = 0x2f6b9d1 | 0;
  Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  performance.now = () => now;
  Date.now = () => t0 + now;
  window.requestAnimationFrame = (cb) => { const id = ++rafId; rafQ.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { rafQ.delete(id); };
  window.setTimeout = (fn, ms = 0, ...a) => { const id = ++timerId; timers.set(id, { at: now + Math.max(0, +ms || 0), fn, a, every: 0 }); return id; };
  window.setInterval = (fn, ms = 0, ...a) => { const id = ++timerId; const every = Math.max(1, +ms || 0); timers.set(id, { at: now + every, fn, a, every }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  let locked = null;
  Object.defineProperty(Document.prototype, 'pointerLockElement', { configurable: true, get: () => locked });
  Element.prototype.requestPointerLock = function () { locked = this; realSetTimeout(() => document.dispatchEvent(new Event('pointerlockchange')), 0); return Promise.resolve(); };
  Document.prototype.exitPointerLock = function () { locked = null; realSetTimeout(() => document.dispatchEvent(new Event('pointerlockchange')), 0); };
  window.__vt = {
    step(dt) {
      const target = now + dt;
      for (let guard = 0; guard < 10000; guard++) {
        let next = null;
        for (const [id, t] of timers) if (t.at <= target && (!next || t.at < next[1].at)) next = [id, t];
        if (!next) break;
        const [id, t] = next;
        now = Math.max(now, t.at);
        if (t.every) t.at += t.every; else timers.delete(id);
        try { typeof t.fn === 'function' ? t.fn(...t.a) : (0, eval)(String(t.fn)); } catch (e) { console.error(e); }
      }
      now = target;
      const q = rafQ; rafQ = new Map();
      for (const cb of q.values()) { try { cb(now); } catch (e) { console.error(e); } }
    },
    presented: () => new Promise((r) => realRAF(() => r())),
  };
})();`;

// A visible cursor / tap marker so viewers can follow what the script is doing.
const CURSOR_OVERLAY = (mobile) => `(() => {
  const install = () => {
    if (document.getElementById('__rec_cursor')) return;
    const c = document.createElement('div');
    c.id = '__rec_cursor';
    c.style.cssText = 'position:fixed;left:0;top:0;width:${mobile ? 44 : 22}px;height:${mobile ? 44 : 22}px;margin:-${mobile ? 22 : 11}px 0 0 -${mobile ? 22 : 11}px;border-radius:50%;pointer-events:none;z-index:2147483647;background:rgba(255,255,255,.35);border:2px solid rgba(20,20,20,.75);box-shadow:0 0 0 2px rgba(255,255,255,.6),0 4px 14px rgba(0,0,0,.35);transition:transform .12s ease,opacity .2s;opacity:${mobile ? 0 : 1};transform:translate(-100px,-100px)';
    document.documentElement.appendChild(c);
    let x = -100, y = -100, down = false;
    const paint = () => { c.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + (down ? 0.75 : 1) + ')'; };
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; paint(); }, true);
    addEventListener('pointerdown', (e) => { x = e.clientX; y = e.clientY; down = true; ${mobile ? "c.style.opacity = 1;" : ""} paint(); }, true);
    addEventListener('pointerup', () => { down = false; paint(); ${mobile ? "setTimeout(() => (c.style.opacity = 0), 260);" : ""} }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();`;

// Scroll helpers evaluated in the page (real time).
const PAGE_HELPERS = `(() => {
  window.__rec = {
    scroller() {
      const se = document.scrollingElement || document.documentElement;
      if (se.scrollHeight > innerHeight + 4) return se;
      let best = null, bh = 0;
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4 && el.clientHeight > innerHeight * 0.5 && el.scrollHeight > bh) { bh = el.scrollHeight; best = el; }
      }
      return best || se;
    },
    maxScroll() { const s = this.scroller(); return Math.max(0, s.scrollHeight - s.clientHeight); },
    pos() { return this.scroller().scrollTop; },
    scrollTo(y, pxPerSec) {
      const s = this.scroller();
      const from = s.scrollTop, to = Math.max(0, Math.min(y, this.maxScroll()));
      const dur = Math.max(250, Math.abs(to - from) / pxPerSec * 1000);
      return new Promise((res) => {
        const t0 = performance.now();
        // Trapezoidal velocity: ease in, glide at constant speed, ease out.
        const a = Math.min(0.5, 450 / dur), vmax = 1 / (1 - a);
        const prog = (t) => t < a ? vmax * t * t / (2 * a) : t <= 1 - a ? vmax * (a / 2 + (t - a)) : 1 - vmax * (1 - t) * (1 - t) / (2 * a);
        const tick = () => {
          const t = Math.min(1, (performance.now() - t0) / dur);
          const v = from + (to - from) * prog(t);
          s.scrollTop = v;
          if (s === document.scrollingElement) window.scrollTo(0, v);
          t < 1 ? requestAnimationFrame(tick) : res(s.scrollTop);
        };
        requestAnimationFrame(tick);
      });
    },
  };
})();`;

// ---------------------------------------------------------------- element finding

async function firstVisible(locator) {
  const n = await locator.count().catch(() => 0);
  for (let i = 0; i < n; i++) {
    const l = locator.nth(i);
    if (await l.isVisible().catch(() => false)) {
      const box = await l.boundingBox().catch(() => null);
      if (box && box.width > 0 && box.height > 0) return l;
    }
  }
  return null;
}

async function findControl(page, text) {
  const candidates = [
    page.getByRole("button", { name: text, exact: true }),
    page.getByRole("tab", { name: text, exact: true }),
    page.getByRole("radio", { name: text, exact: true }),
    page.getByRole("link", { name: text, exact: true }),
    page.getByRole("columnheader", { name: text, exact: true }),
    page.getByText(text, { exact: true }),
    page.getByRole("button", { name: text }),
    page.getByText(text),
  ];
  for (const c of candidates) {
    const l = await firstVisible(c);
    if (l) return l;
  }
  return null;
}

async function findMobileMenu(page) {
  const candidates = [
    page.locator('[aria-label="Open menu"]'),
    page.locator("button[aria-label*='menu' i], [role=button][aria-label*='menu' i], button[aria-label*='navigation' i]"),
    page.locator("button[aria-controls][aria-expanded]"),
    page.getByRole("button", { name: /menu/i }),
    page.locator("header button, nav button"),
  ];
  for (const c of candidates) {
    const l = await firstVisible(c);
    if (l) {
      const box = await l.boundingBox();
      if (box && box.y < 160) return l;
    }
  }
  return null;
}

// ---------------------------------------------------------------- real-time capture (UI tasks)

async function glide(page, x, y, ms = 600) {
  const from = page.__mouse || { x: page.viewportSize().width / 2, y: page.viewportSize().height / 2 };
  const steps = Math.max(8, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await sleep(ms / steps);
  }
  page.__mouse = { x, y };
}

async function bringIntoView(page, locator, speed = 900) {
  const box = await locator.boundingBox();
  if (!box) return;
  const vh = page.viewportSize().height;
  if (box.y > vh * 0.15 && box.y + box.height < vh * 0.85) return;
  const pos = await page.evaluate(() => window.__rec.pos());
  await page.evaluate(([y, s]) => window.__rec.scrollTo(y, s), [pos + box.y - vh * 0.38, speed]);
  await sleep(250);
}

async function act(page, mobile, text, notes, { pause = 1100 } = {}) {
  const l = typeof text === "string" ? await findControl(page, text) : await text();
  if (!l) {
    notes.push(`No visible control for "${typeof text === "string" ? text : "menu"}"`);
    return false;
  }
  try {
    await bringIntoView(page, l);
    const box = await l.boundingBox();
    if (mobile) {
      await l.tap({ timeout: 3000 });
    } else {
      await glide(page, box.x + box.width / 2, box.y + box.height / 2, 520);
      await sleep(120);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await sleep(pause);
    return true;
  } catch (e) {
    notes.push(`Could not activate "${typeof text === "string" ? text : "menu"}": ${String(e.message || e).split("\n")[0]}`);
    return false;
  }
}

async function captureScreencast(page, cdp, size, dpr, framesDir, script) {
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  const frames = [];
  cdp.on("Page.screencastFrame", async (f) => {
    const idx = frames.length;
    const file = path.join(framesDir, `f${String(idx).padStart(6, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 88,
    maxWidth: size.width * dpr,
    maxHeight: size.height * dpr,
    everyNthFrame: 1,
  });
  const startWall = Date.now() / 1000;
  await script();
  await sleep(400);
  await cdp.send("Page.stopScreencast");
  const endWall = Date.now() / 1000;
  if (!frames.length) throw new Error("no screencast frames");
  // Build an ffconcat list with real per-frame durations, then resample to constant 30 fps.
  const lines = ["ffconcat version 1.0"];
  for (let i = 0; i < frames.length; i++) {
    const next = i + 1 < frames.length ? frames[i + 1].t : frames[i].t + Math.max(0.04, endWall - startWall - (frames[i].t - frames[0].t));
    lines.push(`file '${frames[i].file}'`, `duration ${Math.max(0.001, next - frames[i].t).toFixed(4)}`);
  }
  lines.push(`file '${frames[frames.length - 1].file}'`);
  const list = path.join(framesDir, "list.ffconcat");
  fs.writeFileSync(list, lines.join("\n"));
  return list;
}

async function landingScenario(page, mobile, notes) {
  await sleep(1800);
  if (mobile) {
    const opened = await act(page, true, () => findMobileMenu(page), notes, { pause: 1300 });
    if (opened) {
      const again = await findMobileMenu(page);
      if (again) await again.tap({ timeout: 2000 }).catch(() => page.keyboard.press("Escape"));
      else await page.keyboard.press("Escape");
      await sleep(700);
    }
  } else {
    const cta = await findControl(page, "Start free");
    if (cta) {
      const b = await cta.boundingBox();
      await glide(page, b.x + b.width / 2, b.y + b.height / 2, 700);
      await sleep(900);
    }
  }
  // Slow enough to read the design: roughly half a screen per second.
  const speed = mobile ? 560 : 640;
  // Scroll to pricing, flip to Yearly, continue to the FAQ, open the first answer, finish at the footer.
  const yearly = await findControl(page, "Yearly");
  if (yearly) {
    await bringIntoView(page, yearly, speed * 0.75);
    await act(page, mobile, "Yearly", notes, { pause: 1500 });
  } else notes.push('No visible control for "Yearly"');
  const faq = await findControl(page, "Is there really a free plan?");
  if (faq) {
    await bringIntoView(page, faq, speed * 0.75);
    await act(page, mobile, "Is there really a free plan?", notes, { pause: 1500 });
  } else notes.push("FAQ question not found");
  const max = await page.evaluate(() => window.__rec.maxScroll());
  await page.evaluate(([y, s]) => window.__rec.scrollTo(y, s), [max, speed * 0.75]);
  await sleep(1400);
  await page.evaluate(([s]) => window.__rec.scrollTo(0, s), [speed * 4]);
  await sleep(900);
}

async function dashboardScenario(page, mobile, notes) {
  await sleep(1800);
  if (mobile) {
    const opened = await act(page, true, () => findMobileMenu(page), notes, { pause: 1300 });
    if (opened) {
      await page.keyboard.press("Escape");
      await sleep(400);
      const vis = await page.evaluate(() => {
        const el = document.elementFromPoint(innerWidth - 20, innerHeight / 2);
        return el ? el.tagName : "";
      });
      // Tap outside the drawer to close it if Escape did nothing.
      if (vis) await page.touchscreen.tap(370, 420).catch(() => {});
      await sleep(800);
    }
    const max = await page.evaluate(() => window.__rec.maxScroll());
    await page.evaluate(([y]) => window.__rec.scrollTo(y, 700), [max]);
    await sleep(1200);
    const dark = await page.locator('[aria-label="Toggle dark mode"]').first();
    if (await dark.isVisible().catch(() => false)) {
      await page.evaluate(([s]) => window.__rec.scrollTo(0, s), [3000]);
      await sleep(400);
      await act(page, true, async () => dark, notes, { pause: 1300 });
      await page.evaluate(([y]) => window.__rec.scrollTo(y, 900), [max]);
      await sleep(900);
    } else notes.push("Dark mode toggle not visible on phone");
    return;
  }
  // Sweep the biggest chart.
  const chartBox = await page.evaluate(() => {
    let best = null;
    for (const el of document.querySelectorAll("svg, canvas")) {
      const r = el.getBoundingClientRect();
      if (r.width > 300 && r.height > 120 && r.top < innerHeight && r.bottom > 0 && (!best || r.width * r.height > best.width * best.height)) best = { x: r.x, y: r.y, width: r.width, height: r.height };
    }
    return best;
  });
  if (chartBox) {
    await glide(page, chartBox.x + chartBox.width * 0.06, chartBox.y + chartBox.height * 0.55, 700);
    await glide(page, chartBox.x + chartBox.width * 0.94, chartBox.y + chartBox.height * 0.5, 3200);
    await sleep(500);
  } else notes.push("No chart found in the first screen");
  await act(page, false, "Amount", notes, { pause: 900 });
  await act(page, false, "Amount", notes, { pause: 900 });
  await act(page, false, "Pending", notes, { pause: 1100 });
  await act(page, false, "All", notes, { pause: 700 });
  await act(page, false, "Next", notes, { pause: 900 });
  await act(page, false, "Previous", notes, { pause: 700 });
  const search = await firstVisible(page.locator("input[type=search], input[placeholder*='earch' i], input[aria-label*='earch' i]"));
  if (search) {
    await page.evaluate(([s]) => window.__rec.scrollTo(0, s), [1600]);
    const b = await search.boundingBox();
    await glide(page, b.x + 40, b.y + b.height / 2, 600);
    await page.mouse.click(b.x + 40, b.y + b.height / 2);
    await page.keyboard.type("Maya", { delay: 140 });
    await sleep(500);
    const table = await firstVisible(page.locator("table, [role=table], [role=grid]"));
    if (table) await bringIntoView(page, table, 1200);
    await sleep(1300);
    await page.evaluate(([s]) => window.__rec.scrollTo(0, s), [1600]);
    await search.fill("").catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
    await sleep(500);
  } else notes.push("No search field found");
  const dark = await firstVisible(page.locator('[aria-label="Toggle dark mode"]'));
  if (dark) {
    await act(page, false, async () => dark, notes, { pause: 1500 });
    const max = await page.evaluate(() => window.__rec.maxScroll());
    await page.evaluate(([y]) => window.__rec.scrollTo(y, 650), [max]);
    await sleep(1000);
    await page.evaluate(() => window.__rec.scrollTo(0, 2500));
    await sleep(700);
  } else notes.push("No dark mode toggle found");
}

// ---------------------------------------------------------------- frame-stepped capture (canvas tasks)

function fpsInputTimeline() {
  // Same for every model: [startSec, endSec, key]. Fire taps are generated separately.
  const holds = [
    [2.0, 4.2, "KeyW"], [3.6, 4.6, "ArrowRight"], [5.2, 6.6, "KeyA"], [6.8, 7.9, "ArrowLeft"],
    [8.0, 10.4, "KeyW"], [9.0, 9.7, "ArrowRight"], [11.0, 12.6, "KeyD"], [12.8, 14.6, "ArrowRight"],
    [14.8, 16.8, "KeyW"], [15.4, 16.0, "ArrowLeft"], [17.6, 18.9, "KeyS"], [19.0, 20.4, "ArrowLeft"],
    [20.6, 22.8, "KeyW"], [21.4, 22.0, "ArrowRight"], [23.4, 24.8, "KeyA"], [25.0, 26.6, "ArrowRight"],
    [26.8, 29.0, "KeyW"], [29.2, 30.0, "ArrowLeft"], [30.4, 31.8, "KeyD"], [32.0, 33.6, "ArrowRight"],
    [33.8, 36.0, "KeyW"], [36.2, 37.0, "ArrowLeft"], [37.2, 38.6, "KeyA"],
  ];
  const fireWindows = [[3.0, 5.0], [6.2, 8.6], [9.6, 11.2], [13.0, 15.4], [16.4, 18.2], [19.6, 21.6], [23.0, 25.6], [27.0, 29.6], [30.6, 33.0], [34.0, 37.4], [38.0, 39.6]];
  const reloads = [11.6, 22.9, 33.7];
  const events = [];
  for (const [a, b, k] of holds) events.push({ t: a, type: "down", key: k }, { t: b, type: "up", key: k });
  for (const [a, b] of fireWindows) for (let t = a; t < b; t += 0.2) events.push({ t, type: "down", key: "KeyF" }, { t: t + 0.07, type: "up", key: "KeyF" });
  for (const t of reloads) events.push({ t, type: "down", key: "KeyR" }, { t: t + 0.1, type: "up", key: "KeyR" });
  return events.sort((x, y) => x.t - y.t);
}

async function captureFrames(page, cdp, framesDir, { seconds, fps, onTime }) {
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  const dt = 1000 / fps;
  const total = Math.round(seconds * fps);
  for (let i = 0; i < total; i++) {
    const t = i / fps;
    if (onTime) await onTime(t);
    await page.evaluate((d) => window.__vt.step(d), dt);
    await page.evaluate(() => window.__vt.presented());
    const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90, optimizeForSpeed: true });
    fs.writeFileSync(path.join(framesDir, `f${String(i).padStart(6, "0")}.jpg`), Buffer.from(data, "base64"));
    if (i % (fps * 5) === 0) log(`    frame ${i}/${total}`);
  }
}

// ---------------------------------------------------------------- per-run orchestration

async function recordView(browser, task, model, view, buildUrl, outDir) {
  const mobile = view === "mobile";
  const size = mobile ? MOBILE : DESKTOP;
  const dpr = mobile ? 2 : 1;
  const stepped = task.dir === "03-hexagon-physics" || task.dir === "04-fps-arena";
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: dpr,
    isMobile: mobile,
    hasTouch: mobile,
    userAgent: mobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
      : undefined,
    colorScheme: "light",
    reducedMotion: "no-preference",
  });
  if (stepped) await context.addInitScript(VIRTUAL_TIME);
  else {
    await context.addInitScript(PAGE_HELPERS);
    await context.addInitScript(CURSOR_OVERLAY(mobile));
  }
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const consoleErrors = new Set();
  const pageErrors = new Set();
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.add(m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => pageErrors.add(String(e.message || e).slice(0, 300)));
  const notes = [];
  const framesDir = path.join(FRAMES_ROOT, `${task.slug}-${model.key}-${view}`);
  const base = path.join(outDir, view);

  await page.goto(buildUrl, { waitUntil: "load", timeout: 60000 }).catch((e) => notes.push(`Load: ${e.message.split("\n")[0]}`));

  if (stepped) {
    const fps = 60;
    let seconds = 20;
    let onTime = null;
    if (task.dir === "04-fps-arena") {
      seconds = 40;
      const timeline = fpsInputTimeline();
      let cursor = 0;
      let played = false;
      let lastRestartCheck = 0;
      onTime = async (t) => {
        if (!played && t >= 1.5) {
          played = true;
          const play = await findControl(page, "Play");
          if (play) {
            const b = await play.boundingBox();
            await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
          } else {
            notes.push('No visible "Play" button; clicked the canvas instead');
            await page.mouse.click(size.width / 2, size.height / 2);
          }
        }
        if (t - lastRestartCheck >= 1 && played) {
          lastRestartCheck = t;
          const restart = await firstVisible(page.getByRole("button", { name: "Restart", exact: true }));
          if (restart) {
            notes.push(`Game over at ${t.toFixed(1)}s; pressed Restart`);
            const b = await restart.boundingBox();
            await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
          }
        }
        while (cursor < timeline.length && timeline[cursor].t <= t) {
          const ev = timeline[cursor++];
          if (ev.type === "down") await page.keyboard.down(ev.key === "KeyF" ? "f" : ev.key === "KeyR" ? "r" : ev.key);
          else await page.keyboard.up(ev.key === "KeyF" ? "f" : ev.key === "KeyR" ? "r" : ev.key);
        }
      };
    }
    // Let the page settle (fonts, module imports) before the clock starts.
    await sleep(1500);
    await captureFrames(page, cdp, framesDir, { seconds, fps, onTime });
    ffmpeg(["-framerate", String(fps), "-i", path.join(framesDir, "f%06d.jpg"), "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `${base}.mp4`]);
    const posterFrame = task.dir === "04-fps-arena" ? Math.round(9 * fps) : Math.round(6 * fps);
    ffmpeg(["-i", path.join(framesDir, `f${String(posterFrame).padStart(6, "0")}.jpg`), "-vf", "scale=1280:-2", "-q:v", "3", `${base}.jpg`]);
  } else {
    await sleep(600);
    const scenario = task.dir === "01-saas-landing" ? landingScenario : dashboardScenario;
    // Poster: the first screen once it has settled.
    await sleep(900);
    await page.screenshot({ path: `${base}-poster.png` });
    const list = await captureScreencast(page, cdp, size, dpr, framesDir, () => scenario(page, mobile, notes));
    ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-vf", `fps=30,scale=${size.width * dpr}:${size.height * dpr}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-movflags", "+faststart", `${base}.mp4`]);
    ffmpeg(["-i", `${base}-poster.png`, "-vf", `scale=${mobile ? 780 : 1280}:-2`, "-q:v", "3", `${base}.jpg`]);
    fs.rmSync(`${base}-poster.png`, { force: true });
  }
  // Lightweight preview for grids.
  const previewW = mobile ? 390 : 720;
  ffmpeg(["-i", `${base}.mp4`, "-vf", `fps=30,scale=${previewW}:-2:flags=lanczos`, "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-an", "-movflags", "+faststart", `${base}-preview.mp4`]);
  await context.close();
  fs.rmSync(framesDir, { recursive: true, force: true });
  return {
    variant: {
      mp4: `${ROUND}/${task.slug}/${model.key}/${view}.mp4`,
      preview: `${ROUND}/${task.slug}/${model.key}/${view}-preview.mp4`,
      poster: `${ROUND}/${task.slug}/${model.key}/${view}.jpg`,
      seconds: probeSeconds(`${base}.mp4`),
      width: size.width * dpr,
      height: size.height * dpr,
      bytes: fs.statSync(`${base}.mp4`).size,
    },
    consoleErrors: [...consoleErrors].slice(0, 12),
    pageErrors: [...pageErrors].slice(0, 12),
    notes,
  };
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
  });
  const manifest = readManifest();
  for (const task of tasks) {
    if (ONLY_TASK && task.slug !== ONLY_TASK && task.dir !== ONLY_TASK) continue;
    for (const model of models) {
      if (ONLY_MODEL && model.key !== ONLY_MODEL) continue;
      const metaPath = path.join(ROOT, "content/runs", task.dir, model.key, "meta.json");
      if (!fs.existsSync(metaPath)) continue;
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      const prev = manifest[task.slug]?.[model.key];
      if (prev && !FORCE && prev.recordedFor === meta.finished_at) continue;
      if (meta.status !== "ok") {
        manifest[task.slug] = { ...(manifest[task.slug] || {}), [model.key]: { recordedFor: meta.finished_at, media: {}, runtime: { note: "No index.html was produced." } } };
        writeManifest(manifest);
        continue;
      }
      log(`record ${task.slug} / ${model.key}`);
      const buildDir = stageBuild(task, model);
      const outDir = path.join(OUT, task.slug, model.key);
      const srv = await serve(buildDir);
      const media = {};
      const runtime = { consoleErrors: [], pageErrors: [], notes: [] };
      try {
        for (const view of task.views) {
          log(`  ${view}`);
          const r = await recordView(browser, task, model, view, srv.url, outDir);
          media[view] = r.variant;
          runtime.consoleErrors.push(...r.consoleErrors.filter((x) => !runtime.consoleErrors.includes(x)));
          runtime.pageErrors.push(...r.pageErrors.filter((x) => !runtime.pageErrors.includes(x)));
          runtime.notes.push(...r.notes.map((n) => `${view}: ${n}`));
        }
      } catch (e) {
        log(`  FAILED: ${e.stack || e}`);
        runtime.notes.push(`Recorder error: ${String(e.message || e).split("\n")[0]}`);
      } finally {
        srv.close();
      }
      manifest[task.slug] = { ...(manifest[task.slug] || {}), [model.key]: { recordedFor: meta.finished_at, media, runtime } };
      writeManifest(manifest);
      log(`  done ${JSON.stringify(Object.fromEntries(Object.entries(media).map(([k, v]) => [k, `${v.seconds}s ${(v.bytes / 1e6).toFixed(1)}MB`])))}`);
    }
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
