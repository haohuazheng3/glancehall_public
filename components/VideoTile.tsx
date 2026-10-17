"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import type { Model, Run, ViewKind } from "@/lib/catalog";
import { mediaUrl } from "@/lib/site";
import s from "./VideoTile.module.css";

type Props = {
  model: Model;
  run: Run | undefined;
  view: ViewKind;
  quality?: "preview" | "full";
  label?: string; // replaces the model name (blind mode)
  hideIdentity?: boolean;
  autoPlay?: boolean; // play while on screen
  videoRef?: Ref<HTMLVideoElement>;
  className?: string;
  rounded?: boolean;
  showLabel?: boolean;
};

export function VideoTile({
  model,
  run,
  view,
  quality = "preview",
  label,
  hideIdentity,
  autoPlay = true,
  videoRef,
  className,
  rounded = true,
  showLabel = true,
}: Props) {
  const local = useRef<HTMLVideoElement | null>(null);
  const want = useRef(false); // should be playing (on screen and not paused by the viewer)
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const variant = run?.media?.[view];
  const src = mediaUrl(quality === "preview" ? variant?.preview : variant?.mp4) ?? mediaUrl(variant?.mp4);
  const poster = mediaUrl(variant?.poster);
  const name = label ?? model.name;
  const isPhone = view === "mobile";

  const setRefs = (el: HTMLVideoElement | null) => {
    local.current = el;
    if (typeof videoRef === "function") videoRef(el);
    else if (videoRef && "current" in (videoRef as object)) (videoRef as { current: HTMLVideoElement | null }).current = el;
  };

  useEffect(() => {
    const v = local.current;
    if (!v || !autoPlay) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const io = new IntersectionObserver(
      ([e]) => {
        want.current = e.isIntersecting;
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.35 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, [autoPlay, src]);

  const tone = `m-${model.accent}`;
  const frameClass = `${s.frame} ${isPhone ? s.phone : s.desktop} ${rounded ? s.rounded : ""} ${className ?? ""}`;

  if (!run || run.status === "pending" || (run.status === "ok" && !src)) {
    return (
      <div className={frameClass}>
        <div className={`skeleton ${s.fill}`} />
        <div className={s.center}>
          <span className={s.pending}>{run?.status === "ok" ? "Recording the video" : "Being built right now"}</span>
        </div>
        {showLabel && <Label name={name} tone={hideIdentity ? "" : tone} />}
      </div>
    );
  }

  if (run.status === "failed") {
    return (
      <div className={frameClass}>
        <div className={s.failed}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="4" />
            <path d="M9 10l6 6M15 10l-6 6" />
          </svg>
          <span>No working build was delivered</span>
        </div>
        {showLabel && <Label name={name} tone={hideIdentity ? "" : tone} />}
      </div>
    );
  }

  return (
    <div className={frameClass}>
      {!loaded && poster == null && <div className={`skeleton ${s.fill}`} />}
      <video
        ref={setRefs}
        className={s.video}
        src={src ?? undefined}
        poster={poster ?? undefined}
        muted
        loop
        playsInline
        preload={autoPlay ? "metadata" : "none"}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedData={() => setLoaded(true)}
        onCanPlay={() => {
          // A play() issued before data arrived can be dropped; retry once the video is ready.
          const v = local.current;
          if (want.current && v?.paused) v.play().catch(() => {});
        }}
        aria-label={`${name}: recording of the ${view === "mobile" ? "phone" : "desktop"} build`}
      />
      <button
        className={`${s.toggle} ${playing ? s.isPlaying : ""}`}
        aria-label={playing ? `Pause ${name}` : `Play ${name}`}
        onClick={() => {
          const v = local.current;
          if (!v) return;
          want.current = v.paused;
          if (v.paused) v.play().catch(() => {});
          else v.pause();
        }}
      >
        <span className={s.playIcon} aria-hidden="true">
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" /><rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.3-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5z" fill="currentColor" /></svg>
          )}
        </span>
      </button>
      {showLabel && <Label name={name} tone={hideIdentity ? "" : tone} />}
    </div>
  );
}

function Label({ name, tone }: { name: string; tone: string }) {
  return (
    <span className={`${s.label} ${tone}`}>
      <span className="m-dot" />
      {name}
    </span>
  );
}
