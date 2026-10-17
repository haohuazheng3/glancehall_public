import Link from "next/link";
import { formatDate, getCategory, type Post } from "@/lib/blog";

export function PostList({ posts }: { posts: Post[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
      {posts.map((p) => (
        <Link key={p.slug} href={`/blog/${p.category}/${p.slug}`} className="module lift" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="eyebrow">{getCategory(p.category)?.title}</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 28, lineHeight: 1.1 }}>{p.title}</span>
          <span className="muted" style={{ fontSize: 14.5 }}>
            {p.description}
          </span>
          <time dateTime={p.published} className="faint mono" style={{ fontSize: 12, marginTop: "auto" }}>
            {formatDate(p.published)}
          </time>
        </Link>
      ))}
    </div>
  );
}
