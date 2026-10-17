"use client";

import { useState } from "react";
import s from "./PromptBlock.module.css";

export function PromptBlock({ prompt }: { prompt: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    setCopied(true); // instant feedback; clipboard catches up
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <section className={`module ${s.box}`} aria-labelledby="prompt-h">
      <div className={s.head}>
        <div>
          <h2 id="prompt-h" className="h3">
            The exact prompt
          </h2>
          <p className="faint">Sent word for word to every model. Try it on your own favourite.</p>
        </div>
        <div className={s.actions}>
          <button className="btn btn-ghost btn-sm" onClick={copy} aria-live="polite">
            {copied ? "Copied" : "Copy prompt"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="prompt-body">
            {open ? "Collapse" : "Read it"}
          </button>
        </div>
      </div>
      <div id="prompt-body" className={`${s.body} ${open ? s.open : ""}`}>
        <pre className={s.pre}>{prompt}</pre>
        {!open && <button className={s.fade} onClick={() => setOpen(true)} aria-label="Expand the prompt" tabIndex={-1} />}
      </div>
    </section>
  );
}
