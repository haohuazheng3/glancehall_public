"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRegion, onConsentChange, readConsent, writeConsent } from "./consent";
import s from "./CookieConsent.module.css";

// Shown only where analytics need opt-in (EU, EEA, UK, Switzerland, or an unknown location) and no choice is stored yet.
export function CookieConsent() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let alive = true;
    const check = () => {
      if (readConsent() != null) return setShow(false);
      void getRegion().then((r) => {
        if (alive) setShow(r === "optin" && readConsent() == null);
      });
    };
    check();
    const off = onConsentChange(check);
    return () => {
      alive = false;
      off();
    };
  }, []);
  if (!show) return null;
  return (
    <div className={s.wrap} role="region" aria-label="Privacy choices">
      <div className={s.card}>
        <p className={s.text}>
          We&apos;d like to use privacy-friendly analytics to see which builds people watch. Nothing is sold or used for ads.{" "}
          <Link href="/privacy#cookies">Details</Link>
        </p>
        <div className={s.actions}>
          <button className="btn btn-ghost btn-sm" onClick={() => writeConsent("denied")}>
            Decline
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => writeConsent("granted")}>
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
