import { SITE, SITE_URL } from "./site";

export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE.name,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo-512.png`,
    email: SITE.contactEmail,
    slogan: SITE.tagline,
    description: SITE.description,
    foundingDate: String(SITE.foundedYear),
    sameAs: [] as string[],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE.name,
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en",
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export function videoLd(v: { name: string; description: string; thumbnailUrl: string; contentUrl: string; uploadDate: string; durationSec?: number; pagePath: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: v.name,
    description: v.description,
    thumbnailUrl: [v.thumbnailUrl],
    contentUrl: v.contentUrl,
    uploadDate: v.uploadDate,
    duration: v.durationSec ? `PT${Math.round(v.durationSec)}S` : undefined,
    embedUrl: `${SITE_URL}${v.pagePath}`,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function articleLd(a: { title: string; description: string; path: string; published: string; updated: string; image?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    mainEntityOfPage: `${SITE_URL}${a.path}`,
    datePublished: a.published,
    dateModified: a.updated,
    image: a.image ? [a.image] : undefined,
    author: { "@type": "Organization", name: SITE.name, url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}
