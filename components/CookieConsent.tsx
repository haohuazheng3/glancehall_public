"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { needsOptIn, readConsent, writeConsent } from "./consent";
import s from "./CookieConsent.module.css";

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [optIn, setOptIn] = useState(true);
  useEffect(() => {
    if (readConsent() == null) {
      setOptIn(needsOptIn());
      setShow(true);
    }
  }, []);
  if (!show) return null;
  const choose = (v: "granted" | "denied") => {
    writeConsent(v);
    setShow(false);
  };
  return (
    <div className={s.wrap} role="region" aria-label="Privacy choices">
      <div className={s.card}>
        <p className={s.text}>
          {optIn
            ? "We'd like to use privacy-friendly analytics to see which builds people watch. Nothing is sold or used for ads."
            : "We use privacy-friendly analytics to see which builds people watch. Nothing is sold or used for ads. You can opt out."}{" "}
          <Link href="/privacy#cookies">Details</Link>
        </p>
        <div className={s.actions}>
          <button className="btn btn-ghost btn-sm" onClick={() => choose("denied")}>
            {optIn ? "Decline" : "Opt out"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => choose("granted")}>
            {optIn ? "Allow" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
