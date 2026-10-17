import { SITE } from "@/lib/site";

// Two frames side by side; the one on the right is lifted, the way a pick stands out.
export function LogoMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect x="3.1" y="8.6" width="11.2" height="20.3" rx="4.6" fill="none" stroke="currentColor" strokeWidth="2.3" />
      <rect x="17.7" y="3" width="11.2" height="20.3" rx="4.6" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <LogoMark />
      <span style={{ fontWeight: 620, letterSpacing: "-0.025em", fontSize: 16.5 }}>{SITE.name}</span>
    </span>
  );
}
