"use client";

import { useState } from "react";
import { reportClientError } from "./ClientErrorReporter";

// Fires a deliberate browser-side error report so the client pipeline can be verified.
export function AdminClientErrorButton() {
  const [sent, setSent] = useState(false);
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={() => {
        setSent(true);
        reportClientError("TestClientError", `Deliberate client test error ${new Date().toISOString()}`, new Error("test").stack);
        setTimeout(() => location.reload(), 900);
      }}
    >
      {sent ? "Sent" : "Throw client test error"}
    </button>
  );
}
