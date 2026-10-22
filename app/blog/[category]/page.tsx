import type { Metadata } from "next";
import { CATEGORIES, getCategory, postsIn } from "@/lib/blog";
import { CategoryHub } from "./CategoryHub";

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const c = getCategory((await params).category);
  if (!c) return {};
  const empty = postsIn(c.slug).length === 0;
  return {
    title: c.metaTitle,
    description: c.description,
    keywords: [...c.keywords],
    alternates: { canonical: `/blog/${c.slug}` },
    // Empty hubs stay out of the index until they have something worth finding.
    ...(empty ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  return <CategoryHub category={(await params).category} page={1} />;
}
