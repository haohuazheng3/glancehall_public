"use client";

import { useEffect } from "react";
import { reportClientError } from "@/components/ClientErrorReporter";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error.name, error.message + (error.digest ? ` (digest ${error.digest})` : ""), error.stack);
  }, [error]);
  return (
    <div className="wrap" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20, paddingTop: "8vh" }}>
      <p className="eyebrow">Something broke</p>
      <h1 className="h1">That wasn&apos;t supposed to happen.</h1>
      <p className="lede">The error has been reported. Trying again usually works.</p>
      <button className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
