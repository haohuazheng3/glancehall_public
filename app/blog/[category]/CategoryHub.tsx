import Link from "next/link";
import { notFound } from "next/navigation";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { formatDate, getCategory, getHub, PAGE_SIZE, postsIn } from "@/lib/blog";
import { JsonLd, breadcrumbLd } from "@/lib/seo";
import { mdxComponents } from "@/components/mdx/Embeds";
import { PostList } from "@/components/PostList";
import { SITE } from "@/lib/site";
import s from "../../listing.module.css";

// A category page is a hub in its own right: its own keyword, an editorial introduction that earns the
// ranking, then every post in the category (paginated so no single page grows without limit).
export async function CategoryHub({ category, page }: { category: string; page: number }) {
  const c = getCategory(category);
  if (!c) notFound();
  const all = postsIn(c.slug);
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  if (page < 1 || page > pages) notFound();
  const posts = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hub = page === 1 ? getHub(c.slug) : null;
  const Intro = hub ? (await evaluate(hub.body, { ...runtime, baseUrl: import.meta.url, remarkPlugins: [remarkGfm], useMDXComponents: () => mdxComponents })).default : null;
  return (
    <div className="wrap">
      <JsonLd data={breadcrumbLd([{ name: "Journal", path: "/blog" }, { name: c.title, path: `/blog/${c.slug}` }])} />
      <header className={s.head}>
        <nav aria-label="Breadcrumb" style={{ display: "flex", gap: 8, fontSize: 13.5, color: "var(--text-3)" }}>
          <Link href="/blog">Journal</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{c.title}</span>
        </nav>
        <h1 className="h1">{page === 1 ? c.h1 : `${c.h1} (page ${page})`}</h1>
        <p className="lede">{c.description}</p>
        {hub?.updated && (
          <p className="faint mono" style={{ fontSize: 13, margin: 0 }}>
            By {SITE.name} · Updated <time dateTime={hub.updated}>{formatDate(hub.updated)}</time>
          </p>
        )}
      </header>
      {Intro && (
        <article className="module module-pad" style={{ marginBottom: 32, maxWidth: 900 }}>
          <div className="prose">
            <Intro />
          </div>
        </article>
      )}
      <h2 className="h3" style={{ marginBottom: 16 }}>
        {all.length ? `${all.length} ${all.length === 1 ? "page" : "pages"} in ${c.title}` : c.title}
      </h2>
      {posts.length ? (
        <PostList posts={posts} />
      ) : (
        <div className="module module-pad" style={{ textAlign: "center" }}>
          <p className="h3" style={{ margin: 0 }}>
            First posts are on the way.
          </p>
          <p className="muted" style={{ margin: "8px 0 0" }}>
            Meanwhile, the builds speak for themselves. <Link href="/tasks" style={{ textDecoration: "underline" }}>Watch them</Link>.
          </p>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Pagination" style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 32 }}>
          {Array.from({ length: pages }).map((_, i) => (
            <Link key={i} className={`btn btn-sm ${i + 1 === page ? "btn-primary" : "btn-ghost"}`} href={i === 0 ? `/blog/${c.slug}` : `/blog/${c.slug}/page/${i + 1}`} aria-current={i + 1 === page ? "page" : undefined}>
              {i + 1}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
