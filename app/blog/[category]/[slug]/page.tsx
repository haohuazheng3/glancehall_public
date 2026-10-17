import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { formatDate, getAllPosts, getCategory, getPost } from "@/lib/blog";
import { JsonLd, articleLd, breadcrumbLd } from "@/lib/seo";
import { SITE } from "@/lib/site";
import s from "@/components/DocPage.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  const posts = getAllPosts();
  // Placeholder keeps the route buildable before the first post; it 404s.
  return posts.length ? posts.map((p) => ({ category: p.category, slug: p.slug })) : [{ category: "comparisons", slug: "coming-soon" }];
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; slug: string }> }): Promise<Metadata> {
  const { category, slug } = await params;
  const p = getPost(category, slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `/blog/${p.category}/${p.slug}` },
    openGraph: { type: "article", publishedTime: p.published, modifiedTime: p.updated, authors: [SITE.name] },
  };
}

export default async function PostPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  const p = getPost(category, slug);
  const c = getCategory(category);
  if (!p || !c) notFound();
  const { default: Content } = await evaluate(p.body, { ...runtime, baseUrl: import.meta.url });
  const path = `/blog/${p.category}/${p.slug}`;
  return (
    <div className="wrap">
      <JsonLd
        data={[
          articleLd({ title: p.title, description: p.description, path, published: p.published, updated: p.updated, image: p.cover }),
          breadcrumbLd([
            { name: "Journal", path: "/blog" },
            { name: c.title, path: `/blog/${c.slug}` },
            { name: p.title, path },
          ]),
        ]}
      />
      <header className={s.head}>
        <nav aria-label="Breadcrumb" style={{ display: "flex", gap: 8, fontSize: 13.5, color: "var(--text-3)" }}>
          <Link href="/blog">Journal</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/blog/${c.slug}`}>{c.title}</Link>
        </nav>
        <h1 className="h1">{p.title}</h1>
        <p className="lede">{p.description}</p>
        <p className={s.updated}>
          By {SITE.name} · Published <time dateTime={p.published}>{formatDate(p.published)}</time>
          {p.updated !== p.published && (
            <>
              {" "}
              · Updated <time dateTime={p.updated}>{formatDate(p.updated)}</time>
            </>
          )}
        </p>
      </header>
      <article className={`module ${s.body}`}>
        <div className="prose">
          <Content />
        </div>
      </article>
    </div>
  );
}
