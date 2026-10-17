import type { NextConfig } from "next";

const INDEXABLE = process.env.SITE_INDEXABLE === "true";
const MEDIA = (process.env.NEXT_PUBLIC_MEDIA_BASE ?? "").replace(/\/$/, "");
const mediaOrigin = MEDIA ? new URL(MEDIA).origin : "";

const csp = [
  "default-src 'self'",
  // React dev tooling needs eval(); production never does.
  `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === "production" ? "" : "'unsafe-eval'"} https://flowglance.com https://*.flowglance.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${mediaOrigin} https://flowglance.com https://*.flowglance.com`,
  `media-src 'self' blob: ${mediaOrigin}`,
  "font-src 'self'",
  // FlowGlance loads from flowglance.com and reports to collect.flowglance.com.
  `connect-src 'self' https://flowglance.com https://*.flowglance.com`,
  `frame-src 'self' ${mediaOrigin}`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
]
  .join("; ")
  .replace(/\s+;/g, ";");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    const rules = [{ source: "/:path*", headers: securityHeaders }];
    if (!INDEXABLE) rules.push({ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] });
    return rules;
  },
};

export default config;
