import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("/api/health is 200 whenever the site can serve; open errors are informational", () => {
  const src = fs.readFileSync("app/api/health/route.ts", "utf8");
  const healthy = src.match(/const healthy = ([^;]+);/);
  assert.ok(healthy, "healthy expression not found");
  assert.match(healthy[1], /database\.ok/);
  assert.match(healthy[1], /missing\.length === 0/);
  assert.doesNotMatch(healthy[1], /openErrors/, "open errors must not make /api/health non-200");
  assert.match(src, /\n\s+openErrors,\n/, "openErrors stays in the JSON");
  assert.match(src, /healthy \? 200 : 503/);
});

test("the open-errors digest is once per UTC day, only when something is open, and read-only", () => {
  const src = fs.readFileSync("app/api/errors/digest/route.ts", "utf8");
  assert.match(src, /if \(errors === 0\) return/);
  assert.match(src, /rateLimit\("digest:open-errors", 1, DAY_SEC\)/);
  assert.match(src, /const DAY_SEC = 24 \* 60 \* 60;/);
  assert.doesNotMatch(src, /\b(update|delete|insert)\s+(from\s+|into\s+)?error_groups/i, "digest must not change error records");
});

// The worker source stays in the private repository; this part is skipped where it isn't present.
const STATE = new URL("../workers/health/src/state.js", import.meta.url);
const hasWorker = fs.existsSync(STATE);

test("health alerts: DOWN after 2 failures, quiet while down, daily reminder, one RECOVERED", { skip: !hasWorker }, async () => {
  const { nextState, REMIND_MS } = await import(STATE);
  const MIN = 60_000;
  let t = Date.parse("2026-11-06T00:00:00Z");
  let s = {};
  const step = (status, dt = 5 * MIN) => {
    t += dt;
    const r = nextState(s, { status }, t);
    s = r.state;
    return r.alert ? r.alert.kind : null;
  };
  assert.equal(step(200), null);
  assert.equal(step(0), null, "one failed probe is not an outage");
  assert.equal(step(200), null, "a blip that never alerted sends no recovery");
  assert.equal(step(503), null);
  assert.equal(step(0), "down", "second consecutive failure alerts (timeouts count)");
  const since = s.failingSince;
  for (let i = 0; i < 20; i++) assert.equal(step(503), null, "silent while still down");
  assert.equal(s.failingSince, since);
  assert.equal(step(503, REMIND_MS), "reminder");
  assert.equal(step(503), null);
  assert.equal(step(200), "recovered");
  assert.equal(step(200), null);
  assert.equal(s.failures, 0);
  assert.equal(s.failingSince, null);
});

test("health alerts: state written by the old worker recovers once without a fresh DOWN", { skip: !hasWorker }, async () => {
  const { nextState } = await import(STATE);
  const legacy = { healthy: false, status: 503, checkedAt: "2026-11-06T09:00:00.000Z", failingSince: "2026-10-29T10:00:00.000Z", lastAlertAt: "2026-11-06T06:00:00.000Z" };
  const now = Date.parse("2026-11-06T09:05:00Z");
  const still = nextState(legacy, { status: 503 }, now);
  assert.equal(still.alert, null, "already alerted for this incident");
  assert.equal(still.state.failingSince, legacy.failingSince);
  const back = nextState(legacy, { status: 200 }, now);
  assert.deepEqual(back.alert, { kind: "recovered", failingSince: legacy.failingSince });
});

test("digest is due once per UTC day while up with open errors", { skip: !hasWorker }, async () => {
  const { digestDue } = await import(STATE);
  const now = Date.parse("2026-11-06T12:00:00Z");
  assert.equal(digestDue({ healthy: true, lastDigestDate: null }, { openErrors: 6 }, now), "2026-11-06");
  assert.equal(digestDue({ healthy: true, lastDigestDate: "2026-11-06" }, { openErrors: 6 }, now), null);
  assert.equal(digestDue({ healthy: true, lastDigestDate: "2026-11-05" }, { openErrors: 1 }, now), "2026-11-06");
  assert.equal(digestDue({ healthy: true, lastDigestDate: null }, { openErrors: 0 }, now), null);
  assert.equal(digestDue({ healthy: true, lastDigestDate: null }, null, now), null);
  assert.equal(digestDue({ healthy: false, lastDigestDate: null }, { openErrors: 6 }, now), null);
});
