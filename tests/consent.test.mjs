import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const { optIn } = JSON.parse(fs.readFileSync("lib/consent-regions.json", "utf8"));
const EU27 = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" ");

test("opt-in regions are exactly the EU, the rest of the EEA, the UK and Switzerland", () => {
  assert.equal(new Set(optIn).size, optIn.length, "duplicate country code");
  assert.deepEqual([...optIn].sort(), [...EU27, "IS", "LI", "NO", "GB", "CH"].sort());
  for (const open of ["US", "CA", "AU", "JP", "IN", "BR"]) assert.ok(!optIn.includes(open), `${open} should not need opt-in`);
});

test("/api/geo trusts only Vercel's country header and treats an unknown location as opt-in", () => {
  const src = fs.readFileSync("app/api/geo/route.ts", "utf8");
  assert.match(src, /x-vercel-ip-country/);
  assert.match(src, /!country \|\| OPT_IN\.has\(country\)/);
  assert.match(src, /private, max-age=/, "the answer must never be cached at the edge for other visitors");
});

test("FlowGlance never loads after an opt-out, and the footer offers one on every page", () => {
  const consent = fs.readFileSync("components/consent.ts", "utf8");
  assert.match(consent, /if \(c\) return c === "granted";/);
  assert.match(fs.readFileSync("components/Footer.tsx", "utf8"), /<DoNotTrack \/>/);
  assert.match(fs.readFileSync("components/DoNotTrack.tsx", "utf8"), /Do not track me/);
  const privacy = fs.readFileSync("app/privacy/page.tsx", "utf8");
  for (const s of ["Do not track me", "gh_consent", "gh_region", "Switzerland"]) assert.ok(privacy.includes(s), `privacy policy should mention ${s}`);
});
