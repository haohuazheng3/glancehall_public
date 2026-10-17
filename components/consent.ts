// Analytics consent: opt-in where the law expects it (EU/UK/EEA time zones), notice + opt-out elsewhere.
export type Consent = "granted" | "denied" | null;

const KEY = "consent.analytics";
const EVENT = "consentchange";

export function readConsent(): Consent {
  try {
    const v = localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(v: Exclude<Consent, null>) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // Blocked storage: the choice applies to this page view only.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: v }));
}

export function onConsentChange(cb: (v: Consent) => void) {
  const h = (e: Event) => cb((e as CustomEvent).detail as Consent);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

export function needsOptIn(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    return /^Europe\//.test(tz) || ["Atlantic/Reykjavik", "Atlantic/Canary", "Atlantic/Madeira", "Atlantic/Azores", "Atlantic/Faroe"].includes(tz);
  } catch {
    return true;
  }
}

export function analyticsAllowed(): boolean {
  const c = readConsent();
  if (c) return c === "granted";
  return !needsOptIn();
}
