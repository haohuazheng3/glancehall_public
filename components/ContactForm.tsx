"use client";

import { useState } from "react";
import { track } from "./Analytics";

type State = "idle" | "sending" | "sent" | "error";
const TOPICS = ["Suggest a brief", "Add a model", "Report a problem", "Something else"];

export function ContactForm() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    const fd = new FormData(e.currentTarget);
    setState("sending");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          topic,
          message: fd.get("message"),
          website: fd.get("website"), // honeypot
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Couldn't send that. Please try again or email us.");
      setState("sent");
      track("contact_sent", { topic });
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Couldn't send that. Please try again or email us.");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "18px 0" }}>
        <p className="h3" style={{ margin: 0 }}>
          Thanks, it&apos;s with us.
        </p>
        <p className="muted" style={{ margin: 0 }}>
          We&apos;ll reply to the address you gave within two business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      <div className="seg" role="radiogroup" aria-label="Topic" style={{ flexWrap: "wrap", borderRadius: 22 }}>
        {TOPICS.map((t) => (
          <button type="button" key={t} role="radio" aria-checked={topic === t} aria-pressed={topic === t} onClick={() => setTopic(t)}>
            {t}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <label>
          <span className="sr-only">Your name</span>
          <input className="field" name="name" autoComplete="name" placeholder="Your name" maxLength={120} />
        </label>
        <label>
          <span className="sr-only">Your email</span>
          <input className="field" name="email" type="email" autoComplete="email" placeholder="you@company.com" required maxLength={200} />
        </label>
      </div>
      <label>
        <span className="sr-only">Message</span>
        <textarea className="field" name="message" placeholder="What's on your mind?" required minLength={5} maxLength={5000} rows={6} />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <button className="btn btn-primary" type="submit" aria-busy={state === "sending"}>
          {state === "sending" ? "Sending" : "Send message"}
        </button>
        {state === "error" && (
          <span role="alert" style={{ color: "var(--bad)", fontSize: 14 }}>
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
