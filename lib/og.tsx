import { ImageResponse } from "next/og";
import { SITE } from "./site";

export const OG_SIZE = { width: 1200, height: 630 };

async function googleFont(family: string, text: string, italic = false): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}${italic ? ":ital@1" : ""}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch (e) {
    console.error("og font fetch failed", e);
    return null;
  }
}

// Fetch posters ourselves and inline them: works for any media origin and never breaks the build.
async function inline(src: string): Promise<string | null> {
  try {
    const r = await fetch(src, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const type = r.headers.get("content-type") ?? "image/jpeg";
    return `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

const MARK = (
  <svg width="40" height="40" viewBox="0 0 32 32">
    <rect x="3.6" y="9.1" width="10.6" height="19.6" rx="4.4" fill="none" stroke="#f2f1ee" strokeWidth="2.6" />
    <rect x="17.8" y="3" width="11" height="20.3" rx="4.6" fill="#f2f1ee" />
  </svg>
);

// One visual language for every share card: dark void, serif headline, floating tiles of real posters.
export async function ogCard({ kicker, title, posters = [] }: { kicker: string; title: string; posters?: (string | null)[] }) {
  const serif = await googleFont("Instrument Serif", title + SITE.tagline);
  const shots = (await Promise.all((posters.filter(Boolean) as string[]).slice(0, 4).map(inline))).filter(Boolean) as string[];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#09090b", color: "#f2f1ee", padding: 56, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "radial-gradient(900px 420px at 30% -10%, rgba(140,160,255,0.14), transparent 70%)" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: shots.length ? 520 : 1088, height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 600, letterSpacing: -0.5 }}>
            {MARK}
            {SITE.name}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 20, letterSpacing: 3, textTransform: "uppercase", color: "#8b8a93" }}>{kicker}</div>
            <div style={{ fontFamily: serif ? "Serif" : undefined, fontSize: shots.length ? 64 : 92, lineHeight: 1.02, letterSpacing: -1 }}>{title}</div>
          </div>
          <div style={{ fontFamily: serif ? "Serif" : undefined, fontSize: 30, color: "#a9a8b0" }}>{SITE.tagline}</div>
        </div>
        {shots.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, width: 560, marginLeft: 20, alignContent: "center" }}>
            {shots.map((src, i) => (
              <div key={i} style={{ display: "flex", width: 270, height: 169, borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.9)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} width={270} height={169} style={{ objectFit: "cover" }} alt="" />
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { ...OG_SIZE, fonts: serif ? [{ name: "Serif", data: serif, style: "normal", weight: 400 }] : undefined }
  );
}
