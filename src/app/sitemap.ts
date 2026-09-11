import type { MetadataRoute } from "next";

import { listMunicipalities } from "@/lib/schools/municipalities";
import { schoolHref } from "@/components/schools/school-card";
import { storeHref } from "@/lib/stores/store-profile";
import { getAllActiveSchoolEntries, getAllActiveStoreEntries, getAllPublicListEntries } from "@/lib/seo/sitemap-data";
import { getSiteBaseUrl } from "@/lib/seo/site-url";

// Escopo inicial do PRD é só MT -- ver CLAUDE.md.
const UF = "MT";

// Same reasoning as every other Supabase-backed route in this project
// (force-dynamic, never statically generated): without this, Next.js
// prerenders sitemap.ts at `next build` time -- the very first build-time
// Supabase dependency this codebase would have had (every other page is
// already force-dynamic, evaluated per-request). That baked a stale
// snapshot into the static output and depends on the build sandbox having
// working Supabase connectivity, which broke the Vercel build for this PR.
// Serving it per-request instead keeps it always current and matches how
// every other data-driven route already runs here.
export const dynamic = "force-dynamic";

/**
 * Next.js file-based Metadata Route -- served at /sitemap.xml automatically,
 * no route handler needed. A single sitemap is well within Google's
 * 50,000-URL-per-file limit here (~2700 schools + ~140 municipalities +
 * static + currently-zero lists/stores), so `generateSitemaps` (for
 * splitting across multiple files) isn't needed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteBaseUrl();
  const url = (path: string) => `${siteUrl}${path}`;

  const [municipalities, schools, stores, lists] = await Promise.all([
    listMunicipalities(UF),
    getAllActiveSchoolEntries(),
    getAllActiveStoreEntries(),
    getAllPublicListEntries(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/escolas"), changeFrequency: "daily", priority: 0.9 },
    { url: url(`/escolas/${UF.toLowerCase()}`), changeFrequency: "daily", priority: 0.9 },
    { url: url("/papelarias"), changeFrequency: "daily", priority: 0.7 },
  ];

  const municipalityEntries: MetadataRoute.Sitemap = municipalities.map((municipality) => ({
    url: url(`/escolas/${UF.toLowerCase()}/${municipality.slug}`),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const schoolEntries: MetadataRoute.Sitemap = schools.map((school) => ({
    url: url(schoolHref(school)),
    lastModified: school.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const storeEntries: MetadataRoute.Sitemap = stores.map((store) => ({
    url: url(storeHref(store)),
    lastModified: store.updatedAt,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const listEntries: MetadataRoute.Sitemap = lists.map((list) => ({
    url: url(`/listas/${list.slug}`),
    lastModified: list.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...municipalityEntries, ...schoolEntries, ...storeEntries, ...listEntries];
}
