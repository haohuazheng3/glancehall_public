// Analytics consent, decided by region.
// - EU, EEA, UK, Switzerland, or anywhere /api/geo cannot place: FlowGlance loads only after "Allow".
// - Everywhere else: FlowGlance loads by default, no banner. "Do not track me" in the footer opts out.
// Choices live in first-party cookies (gh_consent, gh_region) so they apply to every page on this site.
export type Consent = "granted" | "denied" | null;
export type Region = "optin" | "open";

const COOKIE = "gh_consent";
const REGION_COOKIE = "gh_region";
const LEGACY_KEY = "consent.analytics"; // localStorage key used before 2026-10-31
const EVENT = "consentchange";
const DAY = 60 * 60 * 24;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function readConsent(): Consent {
  const v = readCookie(COOKIE);
  if (v === "granted" || v === "denied") return v;
  // Carry over a choice made before the switch to cookies, so earlier opt-outs keep working.
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === "granted" || legacy === "denied") {
      writeCookie(COOKIE, legacy, 180 * DAY);
      localStorage.removeItem(LEGACY_KEY);
      return legacy;
    }
  } catch {
    // Blocked storage: nothing to migrate.
  }
  return null;
}

/** Record a choice (null clears it, so the region default applies again). */
export function writeConsent(v: Consent) {
  if (v) writeCookie(COOKIE, v, 180 * DAY);
  else writeCookie(COOKIE, "", 0);
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Blocked storage: the cookie is the source of truth anyway.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: v }));
}

export function onConsentChange(cb: (v: Consent) => void) {
  const h = (e: Event) => cb((e as CustomEvent).detail as Consent);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

let regionLookup: Promise<Region> | null = null;

/** Whether this visitor needs to opt in. One /api/geo call per browser per 30 days, shared by every caller. */
export function getRegion(): Promise<Region> {
  const known = readCookie(REGION_COOKIE);
  if (known === "optin" || known === "open") return Promise.resolve(known);
  regionLookup ??= fetch("/api/geo")
    .then((r) => (r.ok ? r.json() : { consentRequired: true }))
    .then((g: { consentRequired?: boolean }) => {
      const region: Region = g.consentRequired === false ? "open" : "optin";
      writeCookie(REGION_COOKIE, region, 30 * DAY);
      return region;
    })
    .catch((): Region => {
      // Lookup failed: ask for opt-in this time, and try again on the next page load.
      regionLookup = null;
      return "optin";
    });
  return regionLookup;
}

/** FlowGlance may run: an explicit "Allow", or no choice yet in a region that doesn't need opt-in. */
export async function analyticsAllowed(): Promise<boolean> {
  const c = readConsent();
  if (c) return c === "granted";
  return (await getRegion()) === "open";
}
