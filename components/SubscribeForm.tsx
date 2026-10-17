"use client";

import { useState } from "react";
import { track } from "./Analytics";
import s from "./SubscribeForm.module.css";

type State = "idle" | "sending" | "done" | "error";

export function SubscribeForm({ source = "home" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending"); // flips instantly; the request catches up
    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setState("done");
      track("subscribe", { source });
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <p className={s.done} role="status">
        <span className={s.check} aria-hidden="true">✓</span> You&apos;re on the list. One email when the next round is live, nothing else.
      </p>
    );
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <label htmlFor={`sub-${source}`} className="sr-only">
        Email address
      </label>
      <input
        id={`sub-${source}`}
        className={`field ${s.input}`}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@company.com"
        required
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state === "error") setState("idle");
        }}
      />
      <button className={`btn btn-primary ${s.btn}`} type="submit" aria-busy={state === "sending"}>
        {state === "sending" ? <span className={s.spinner} aria-hidden="true" /> : null}
        {state === "sending" ? "Adding you" : "Notify me"}
      </button>
      {state === "error" && (
        <p className={s.error} role="alert">
          {msg}
        </p>
      )}
    </form>
  );
}
