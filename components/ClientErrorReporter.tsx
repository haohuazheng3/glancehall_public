"use client";

import { useEffect } from "react";

// Sends uncaught browser errors to /api/errors (grouped server-side by fingerprint).
let sent = 0;

export function reportClientError(name: string, message: string, stack?: string) {
  if (sent >= 5) return; // a broken page should not flood the inbox
  sent++;
  const body = JSON.stringify({ name, message: message.slice(0, 1000), stack: (stack || "").slice(0, 4000), route: location.pathname });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon("/api/errors", new Blob([body], { type: "application/json" }));
    else fetch("/api/errors", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  } catch {
    // Reporting is best effort; never throw from the reporter itself.
  }
}

export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // Ignore errors from third-party scripts we can't see into.
      if (!e.error && /^Script error\.?$/.test(e.message)) return;
      reportClientError(e.error?.name || "Error", e.message || String(e.error), e.error?.stack);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      reportClientError(r?.name || "UnhandledRejection", r?.message || String(r), r?.stack);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
