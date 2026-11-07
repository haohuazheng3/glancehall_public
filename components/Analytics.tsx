"use client";

import { useEffect } from "react";
import { analyticsAllowed, onConsentChange, readConsent } from "./consent";

// FlowGlance is the only analytics on this site. Whether it loads is decided in ./consent.
const SITE_KEY = process.env.NEXT_PUBLIC_FLOWGLANCE_SITE;
export const SNIPPET_ID = "fw-snippet";

declare global {
  interface Window {
    fw?: (...args: unknown[]) => void;
  }
}

export function track(name: string, props?: Record<string, unknown>) {
  if (readConsent() === "denied") return;
  try {
    window.fw?.("event", name, props ?? {});
  } catch {
    // Analytics must never break the page.
  }
}

function load() {
  if (!SITE_KEY || document.getElementById(SNIPPET_ID)) return;
  const s = document.createElement("script");
  s.id = SNIPPET_ID;
  s.defer = true;
  s.src = "https://flowglance.com/fw.js";
  s.dataset.site = SITE_KEY;
  document.head.appendChild(s);
}

export function Analytics() {
  useEffect(() => {
    let alive = true;
    const decide = () =>
      void analyticsAllowed().then((ok) => {
        if (alive && ok) load();
      });
    decide();
    const off = onConsentChange(decide);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return null;
}
