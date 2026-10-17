// Shimmering placeholders that match the shape of the page being loaded.
export function PageSkeleton({ tiles = 4 }: { tiles?: number }) {
  return (
    <div className="wrap" aria-busy="true" aria-label="Loading">
      <div style={{ display: "grid", gap: 16, paddingTop: "clamp(24px, 4vw, 48px)", maxWidth: 820 }}>
        <div className="skeleton" style={{ height: 14, width: 120, borderRadius: 999 }} />
        <div className="skeleton" style={{ height: 64, width: "80%", borderRadius: 18 }} />
        <div className="skeleton" style={{ height: 18, width: "60%", borderRadius: 999 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginTop: 40 }}>
        {Array.from({ length: tiles }).map((_, i) => (
          <div key={i} className="module" style={{ padding: 10, borderRadius: 34 }}>
            <div className="skeleton" style={{ aspectRatio: "16 / 10", borderRadius: 24 }} />
            <div style={{ display: "flex", gap: 10, padding: "14px 8px 6px" }}>
              <div className="skeleton" style={{ height: 14, width: 140, borderRadius: 999 }} />
              <div className="skeleton" style={{ height: 14, width: 80, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
