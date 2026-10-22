import type { Metadata } from "next";
import { CATEGORIES, getCategory, PAGE_SIZE, postsIn } from "@/lib/blog";
import { CategoryHub } from "../../CategoryHub";

export const dynamicParams = false;

export function generateStaticParams() {
  const out: { category: string; n: string }[] = [];
  for (const c of CATEGORIES) {
    const pages = Math.ceil(postsIn(c.slug).length / PAGE_SIZE);
    for (let n = 2; n <= pages; n++) out.push({ category: c.slug, n: String(n) });
  }
  // Next needs at least one entry to build the route; this placeholder 404s.
  return out.length ? out : [{ category: CATEGORIES[0].slug, n: "2" }];
}

export async function generateMetadata({ params }: { params: Promise<{ category: string; n: string }> }): Promise<Metadata> {
  const { category, n } = await params;
  const c = getCategory(category);
  if (!c) return {};
  return { title: `${c.metaTitle}, page ${n}`, description: c.description, alternates: { canonical: `/blog/${c.slug}/page/${n}` } };
}

export default async function CategoryPageN({ params }: { params: Promise<{ category: string; n: string }> }) {
  const { category, n } = await params;
  return <CategoryHub category={category} page={Number(n)} />;
}
