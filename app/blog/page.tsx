import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES, getAllPosts, postsIn } from "@/lib/blog";
import { PostList } from "@/components/PostList";
import { Arrow } from "@/components/Stage";
import s from "../listing.module.css";

export const metadata: Metadata = {
  title: "Journal",
  description: "Notes on what the builds show: head-to-head readings, round reports and practical advice for building with AI coding agents.",
  alternates: { canonical: "/blog" },
};

export default function Blog() {
  const posts = getAllPosts();
  const featured = posts.filter((p) => p.featured).slice(0, 3);
  return (
    <div className="wrap">
      <header className={s.head}>
        <p className="eyebrow">Journal</p>
        <h1 className="h1">Notes from the hall.</h1>
        <p className="lede">Readings of the builds, written to help you decide. Still no scores.</p>
      </header>
      <div className={s.grid3}>
        {CATEGORIES.map((c) => {
          const n = postsIn(c.slug).length;
          return (
            <Link key={c.slug} href={`/blog/${c.slug}`} className="module lift" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
              <span className="eyebrow">{n ? `${n} ${n === 1 ? "post" : "posts"}` : "Coming soon"}</span>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 30, lineHeight: 1.05 }}>{c.title}</span>
              <span className="muted" style={{ fontSize: 14.5 }}>
                {c.description}
              </span>
              <span style={{ marginTop: "auto", display: "inline-flex", gap: 8, alignItems: "center", fontSize: 14, fontWeight: 560 }}>
                Browse <Arrow />
              </span>
            </Link>
          );
        })}
      </div>
      {featured.length > 0 && (
        <section className="section" style={{ marginTop: 72 }}>
          <h2 className="h2" style={{ marginBottom: 24 }}>
            Featured
          </h2>
          <PostList posts={featured} />
        </section>
      )}
    </div>
  );
}
