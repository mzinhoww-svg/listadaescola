import type { MetadataRoute } from "next";

import { getSiteBaseUrl } from "@/lib/seo/site-url";

/**
 * Next.js file-based Metadata Route -- served at /robots.txt automatically.
 * Disallowed paths are every authenticated/private area (RLS still governs
 * real access -- this only keeps crawlers out of pages that 302 to /auth or
 * expose no indexable content anyway) plus the API routes, which are
 * redirect/action endpoints, never pages meant to rank.
 *
 * Onda 10: as quatro rotas das Ondas 6/7 entraram depois que esta lista foi
 * escrita e ficaram de fora. Nenhuma delas chega ao sitemap (que é uma
 * lista explícita, não uma varredura do sistema de arquivos), mas todas são
 * alcançáveis por link a partir de páginas públicas -- `/reivindicar-escola`
 * pelo CTA no perfil da escola, `/cadastrar-papelaria` pelo
 * `/para-papelarias` --, então um rastreador chega nelas sozinho e gasta
 * orçamento de rastreio num 302 para /auth.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/minha-conta",
        "/minha-escola",
        "/minha-papelaria",
        "/enviar-lista",
        "/sugerir-escola",
        "/cadastrar-papelaria",
        "/reivindicar-escola",
        "/auth",
        "/api",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
