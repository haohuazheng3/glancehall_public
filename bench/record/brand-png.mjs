// Renders the brand mark to PNG icons (favicon fallback, apple-touch, manifest, schema logo).
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mark = (fg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="3.6" y="9.1" width="10.6" height="19.6" rx="4.4" fill="none" stroke="${fg}" stroke-width="2.6"/><rect x="17.8" y="3" width="11" height="20.3" rx="4.6" fill="${fg}"/></svg>`;
const browser = await chromium.launch();
const page = await browser.newPage();
async function render(file, size, { bg, fg, pad, radius }) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;background:${bg};border-radius:${radius}px;display:flex;align-items:center;justify-content:center"><div style="width:${size - pad * 2}px;height:${size - pad * 2}px">${mark(fg)}</div></div></body></html>`);
  await page.screenshot({ path: path.join(ROOT, file), omitBackground: true });
}
await render("public/brand/logo-512.png", 512, { bg: "#09090b", fg: "#f2f1ee", pad: 108, radius: 112 });
await render("public/brand/logo-192.png", 192, { bg: "#09090b", fg: "#f2f1ee", pad: 40, radius: 42 });
await render("app/apple-icon.png", 180, { bg: "#09090b", fg: "#f2f1ee", pad: 38, radius: 0 });
await render("public/brand/logo-mark-black.png", 512, { bg: "transparent", fg: "#15151a", pad: 32, radius: 0 });
await browser.close();
console.log("brand icons written");
