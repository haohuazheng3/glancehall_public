"use client";

import { useEffect, useState } from "react";
import { analyticsAllowed, onConsentChange } from "./consent";

// FlowGlance is the only analytics on this site. It loads only when consent allows it.
const SITE_KEY = process.env.NEXT_PUBLIC_FLOWGLANCE_SITE;

declare global {
  interface Window {
    fw?: (...args: unknown[]) => void;
  }
}

export function track(name: string, props?: Record<string, unknown>) {
  try {
    window.fw?.("event", name, props ?? {});
  } catch {
    // Analytics must never break the page.
  }
}

export function Analytics() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    setAllowed(analyticsAllowed());
    return onConsentChange(() => setAllowed(analyticsAllowed()));
  }, []);
  useEffect(() => {
    if (!allowed || !SITE_KEY || document.getElementById("fw-snippet")) return;
    const s = document.createElement("script");
    s.id = "fw-snippet";
    s.defer = true;
    s.src = "https://flowglance.com/fw.js";
    s.dataset.site = SITE_KEY;
    document.head.appendChild(s);
  }, [allowed]);
  return null;
}
