"use client";

import { useEffect, useState } from "react";
import { SNIPPET_ID } from "./Analytics";
import { onConsentChange, readConsent, writeConsent } from "./consent";
import s from "./Footer.module.css";

// Footer control on every page: opt out of FlowGlance (or withdraw consent), and undo that later.
export function DoNotTrack() {
  const [off, setOff] = useState(false);
  useEffect(() => {
    setOff(readConsent() === "denied");
    return onConsentChange((v) => setOff(v === "denied"));
  }, []);

  const optOut = () => {
    writeConsent("denied");
    // A running FlowGlance script can't be unloaded: reload so this page continues without it.
    if (document.getElementById(SNIPPET_ID)) window.location.reload();
  };

  if (!off) {
    return (
      <button type="button" className={s.linkButton} onClick={optOut}>
        Do not track me
      </button>
    );
  }
  return (
    <span className={s.trackOff} role="status">
      Not tracked{" "}
      <button type="button" className={s.linkButton} onClick={() => writeConsent(null)} aria-label="Undo: stop opting out of analytics">
        Undo
      </button>
    </span>
  );
}
