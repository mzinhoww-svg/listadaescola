import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { searchSchools } from "@/lib/schools/search-schools";
import { resolveMunicipalitySlug } from "@/lib/schools/municipalities";
import { SchoolCard } from "@/components/schools/school-card";
import { PaginationControls } from "@/components/schools/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { getSiteBaseUrl } from "@/lib/seo/site-url";
import { slugify } from "@/lib/utils";

// Same reasoning as every other Supabase-backed public page: never
// statically prerendered.
export const dynamic = "force-dynamic";

interface CidadePageProps {
  params: Promise<{ uf: string; cidade: string }>;
  searchParams: Promise<{ page?: string }>;
}

/**
 * Coexists with escolas/[uf]/[cidade]/[slug]/page.tsx (school detail) --
 * Next.js resolves a page.tsx at a dynamic segment and a further nested
 * dynamic segment beneath it independently, no conflict.
 */
export async function generateMetadata({ params }: CidadePageProps): Promise<Metadata> {
  const { uf, cidade } = await params;
  // resolve_municipality_slug() does an exact match against slugify(name)
  // -- normalize here so a link/bookmark using the city's natural
  // capitalization (e.g. "Comodoro", how it's displayed everywhere in the
  // UI, including this page's own breadcrumb) resolves instead of 404ing.
  const municipality = await resolveMunicipalitySlug(uf.toUpperCase(), slugify(cidade));
  if (!municipality) return {};

  const title = `Escolas em ${municipality}`;
  const description = `Escolas ativas em ${municipality}, ${uf.toUpperCase()}, com listas de material escolar.`;

  return {
    title,
    description,
    alternates: { canonical: `/escolas/${uf.toLowerCase()}/${cidade}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function CidadePage({ params, searchParams }: CidadePageProps) {
  const { uf, cidade } = await params;
  const ufUpper = uf.toUpperCase();
  const municipality = await resolveMunicipalitySlug(ufUpper, slugify(cidade));
  if (!municipality) notFound();

  const { page: pageParam } = await searchParams;
  const page = pageParam ? Number(pageParam) : 1;
  const result = await searchSchools({ uf: ufUpper, municipality, sort: "popularity", page });

  const siteUrl = getSiteBaseUrl();
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: siteUrl },
      { "@type": "ListItem", position: 2, name: `Escolas em ${ufUpper}`, item: `${siteUrl}/escolas/${uf.toLowerCase()}` },
      {
        "@type": "ListItem",
        position: 3,
        name: municipality,
        item: `${siteUrl}/escolas/${uf.toLowerCase()}/${cidade}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }} />

      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-neutral-500">
        <Link href="/" className="hover:text-primary-700">
          Início
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/escolas/${uf.toLowerCase()}`} className="hover:text-primary-700">
          Escolas em {ufUpper}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-700">{municipality}</span>
      </nav>

      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">Escolas em {municipality}</h1>
      <p className="mb-6 text-neutral-600">
        {result.totalCount} escolas ativas.{" "}
        <Link
          href={`/escolas?uf=${ufUpper}&municipality=${encodeURIComponent(municipality)}`}
          className="font-medium text-primary-700 hover:underline"
        >
          Buscar com filtros
        </Link>
        .
      </p>

      {result.schools.length === 0 ? (
        <EmptyState title="Nenhuma escola encontrada" description="Ainda não há escolas ativas nesta cidade." />
      ) : (
        <>
          <h2 className="sr-only">Resultados</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.schools.map((school) => (
              <SchoolCard key={school.id} school={school} />
            ))}
          </div>
          <div className="mt-6">
            <PaginationControls
              page={result.page}
              pageCount={result.pageCount}
              searchParams={new URLSearchParams()}
              basePath={`/escolas/${uf.toLowerCase()}/${cidade}`}
            />
          </div>
        </>
      )}
    </div>
  );
}
