import type { MetadataRoute } from "next";

import { getSiteBaseUrl } from "@/lib/seo/site-url";

/**
 * Next.js file-based Metadata Route -- served at /robots.txt automatically.
 * Disallowed paths are every authenticated/private area (RLS still governs
 * real access -- this only keeps crawlers out of pages that 302 to /auth or
 * expose no indexable content anyway) plus the API routes, which are
 * redirect/action endpoints, never pages meant to rank.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/minha-conta", "/enviar-lista", "/sugerir-escola", "/auth", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
