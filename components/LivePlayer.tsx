"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { track } from "./Analytics";
import s from "./LivePlayer.module.css";

type Props = {
  src: string;
  task: { slug: string; title: string; category: string; views: string[] };
  model: { key: string; name: string; accent: string; effortLabel: string };
  others: { key: string; name: string; accent: string }[];
  game: boolean;
};

// Runs the model's untouched build in a sandboxed iframe served from a separate origin.
export function LivePlayer({ src, task, model, others, game }: Props) {
  // Phone-only briefs open at phone width; the switch only appears when both widths were recorded.
  const [device, setDevice] = useState<"desktop" | "mobile">(task.views.includes("desktop") ? "desktop" : "mobile");
  const [loaded, setLoaded] = useState(false);
  const [nonce, setNonce] = useState(0);
  // Render the iframe only after hydration: a server-rendered iframe can finish loading before React
  // attaches onLoad, which would leave the loading overlay over the build forever.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const frame = useRef<HTMLIFrameElement>(null);
  const hasMobile = task.views.includes("mobile") && task.views.includes("desktop");

  return (
    <div className={s.page}>
      <div className={s.bar}>
        <Link href={`/tasks/${task.slug}`} className={s.back} aria-label={`Back to ${task.title}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 3 5 8l5 5" />
          </svg>
        </Link>
        <div className={`${s.title} m-${model.accent}`}>
          <span className="m-dot" />
          <span className={s.name}>{model.name}</span>
          <span className={s.sep}>·</span>
          <span className={s.task}>{task.title}</span>
        </div>
        <div className={s.tools}>
          {hasMobile && (
            <div className="seg" aria-label="Device width">
              <button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
                Desktop
              </button>
              <button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>
                Phone
              </button>
            </div>
          )}
          <button
            className={s.icon}
            onClick={() => {
              setLoaded(false);
              setNonce((n) => n + 1);
            }}
            aria-label="Reload the build"
            title="Reload"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M13.5 8a5.5 5.5 0 1 1-1.7-4" />
              <path d="M13.5 2.5v3h-3" />
            </svg>
          </button>
          <a className={s.icon} href={src} target="_blank" rel="noopener noreferrer" aria-label="Open the raw build in a new tab" title="Open raw build" onClick={() => track("open_raw", { task: task.slug, model: model.key })}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 2.5h4.5V7M13.5 2.5 7 9M12 10v3.5H2.5V4H6" />
            </svg>
          </a>
        </div>
      </div>

      <div className={`${s.stage} ${device === "mobile" ? s.stagePhone : ""}`}>
        <div className={`${s.screen} ${device === "mobile" ? s.phone : ""}`}>
          {!loaded && (
            <div className={s.loading}>
              <div className={`skeleton ${s.sk}`} />
              <span>Loading {model.name}&apos;s build</span>
            </div>
          )}
          {mounted && (
          <iframe
            key={nonce}
            ref={frame}
            className={s.iframe}
            src={src}
            title={`${model.name}: ${task.title}, running live`}
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups allow-modals"
            allow="fullscreen; autoplay; gamepad"
            referrerPolicy="no-referrer"
            onLoad={() => {
              setLoaded(true);
              track("play_live", { task: task.slug, model: model.key });
            }}
          />
          )}
        </div>
      </div>

      <div className={s.foot}>
        <p className={s.note}>
          {game ? "Click inside to play. Esc releases the mouse. Sound is on in the game itself. " : ""}
          This is {model.name}&apos;s raw output, running exactly as it was delivered.
        </p>
        {others.length > 0 && (
          <div className={s.others}>
            <span className="faint">Same brief by</span>
            {others.map((o) => (
              <Link key={o.key} href={`/play/${task.slug}/${o.key}`} className={`chip m-${o.accent}`}>
                <span className="m-dot" />
                {o.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
