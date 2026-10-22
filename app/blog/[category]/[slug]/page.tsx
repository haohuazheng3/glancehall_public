import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { rehypeWrapTables } from "@/lib/rehype-wrap-tables";
import rehypeSlug from "rehype-slug";
import { formatDate, getAllPosts, getCategory, getPost, headings, readingMinutes, relatedPosts } from "@/lib/blog";
import { JsonLd, articleLd, breadcrumbLd, faqLd } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { models, numberWord, tasks } from "@/lib/catalog";
import { Figure, Toc, mdxComponents } from "@/components/mdx/Embeds";
import { PostList } from "@/components/PostList";
import s from "@/components/DocPage.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  const posts = getAllPosts();
  // Placeholder keeps the route buildable before the first post; it 404s.
  return posts.length ? posts.map((p) => ({ category: p.category, slug: p.slug })) : [{ category: "head-to-head", slug: "coming-soon" }];
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; slug: string }> }): Promise<Metadata> {
  const { category, slug } = await params;
  const p = getPost(category, slug);
  if (!p) return {};
  return {
    title: p.title,
    description: p.description,
    keywords: p.keywords,
    alternates: { canonical: `/blog/${p.category}/${p.slug}` },
    openGraph: { type: "article", publishedTime: p.published, modifiedTime: p.updated, authors: [SITE.name], images: p.cover ? [{ url: p.cover }] : undefined },
  };
}

export default async function PostPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;
  const p = getPost(category, slug);
  const c = getCategory(category);
  if (!p || !c) notFound();
  const toc = headings(p.body);
  const { default: Content } = await evaluate(p.body, {
    ...runtime,
    baseUrl: import.meta.url,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, rehypeWrapTables],
    useMDXComponents: () => ({ ...mdxComponents, TableOfContents: () => <Toc items={toc} /> }),
  });
  const path = `/blog/${p.category}/${p.slug}`;
  const related = relatedPosts(p);
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
          ...(p.faq.length ? [faqLd(p.faq)] : []),
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
          )}{" "}
          · {readingMinutes(p.words)} min read
        </p>
      </header>
      <article className={`module ${s.body}`}>
        <div className="prose">
          <Content />
          {p.cover && p.coverCredit && <Figure src={p.cover} alt={p.coverAlt ?? p.title} width={p.coverSize?.[0] ?? 1400} height={p.coverSize?.[1] ?? 933} credit={p.coverCredit.name} creditUrl={p.coverCredit.url} />}
          {p.faq.length > 0 && (
            <section aria-labelledby="faq-h">
              <h2 id="frequently-asked-questions">Frequently asked questions</h2>
              {p.faq.map((f) => (
                <div key={f.q}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </section>
          )}
        </div>
      </article>
      <section className="section" aria-labelledby="related-h" style={{ marginTop: 48 }}>
        <div className="module module-pad" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <p className="h3" style={{ margin: 0 }}>
              Judge the builds yourself.
            </p>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {numberWord(tasks.length, true)} briefs, {numberWord(models.length)} models, nothing edited. Watch them side by side or take the blind test.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href="/tasks">
              Watch the builds
            </Link>
            <Link className="btn btn-ghost" href="/methodology">
              How we test
            </Link>
          </div>
        </div>
        {related.length > 0 && (
          <>
            <h2 id="related-h" className="h3" style={{ marginBottom: 16 }}>
              Keep reading
            </h2>
            <PostList posts={related} />
          </>
        )}
      </section>
    </div>
  );
}
