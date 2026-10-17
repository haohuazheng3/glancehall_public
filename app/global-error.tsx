"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      navigator.sendBeacon?.(
        "/api/errors",
        new Blob([JSON.stringify({ name: error.name, message: error.message, stack: error.stack, route: location.pathname })], { type: "application/json" })
      );
    } catch {
      // nothing else we can do from the root boundary
    }
  }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#09090b", color: "#f2f1ee", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontWeight: 500 }}>Something went wrong.</h1>
          <p style={{ color: "#a9a8b0" }}>The error has been reported.</p>
          <button onClick={reset} style={{ marginTop: 16, height: 44, padding: "0 20px", borderRadius: 999, border: 0, background: "#f2f1ee", color: "#09090b", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
