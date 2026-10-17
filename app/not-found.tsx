import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20, paddingTop: "8vh" }}>
      <p className="eyebrow">404</p>
      <h1 className="h1">
        Nothing to <em style={{ fontStyle: "italic" }}>see</em> here.
      </h1>
      <p className="lede">The page you were looking for doesn&apos;t exist, or it moved.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/" className="btn btn-primary">
          Back home
        </Link>
        <Link href="/tasks" className="btn btn-ghost">
          Watch the builds
        </Link>
      </div>
    </div>
  );
}
