import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { searchSchools } from "@/lib/schools/search-schools";
import { listMunicipalities } from "@/lib/schools/municipalities";
import { SchoolCard } from "@/components/schools/school-card";
import { PaginationControls } from "@/components/schools/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { getSiteBaseUrl } from "@/lib/seo/site-url";

// Same reasoning as every other Supabase-backed public page: never
// statically prerendered.
export const dynamic = "force-dynamic";

// Escopo inicial do PRD é só MT (ver CLAUDE.md) -- qualquer outra UF 404,
// em vez de renderizar uma página de estado vazia/sem sentido.
const SUPPORTED_UFS = ["MT"];

interface EstadoPageProps {
  params: Promise<{ uf: string }>;
  searchParams: Promise<{ page?: string }>;
}

function isSupportedUf(uf: string): boolean {
  return SUPPORTED_UFS.includes(uf.toUpperCase());
}

export async function generateMetadata({ params }: EstadoPageProps): Promise<Metadata> {
  const { uf } = await params;
  if (!isSupportedUf(uf)) return {};

  const title = `Escolas em ${uf.toUpperCase()}`;
  const description = `Encontre escolas ativas em ${uf.toUpperCase()} por cidade e veja as listas de material escolar de cada uma.`;

  return {
    title,
    description,
    alternates: { canonical: `/escolas/${uf.toLowerCase()}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function EstadoPage({ params, searchParams }: EstadoPageProps) {
  const { uf } = await params;
  if (!isSupportedUf(uf)) notFound();
  const ufUpper = uf.toUpperCase();
  const { page: pageParam } = await searchParams;
  const page = pageParam ? Number(pageParam) : 1;

  const [municipalities, result] = await Promise.all([
    listMunicipalities(ufUpper),
    searchSchools({ uf: ufUpper, sort: "popularity", page }),
  ]);

  const siteUrl = getSiteBaseUrl();
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: siteUrl },
      { "@type": "ListItem", position: 2, name: `Escolas em ${ufUpper}`, item: `${siteUrl}/escolas/${uf.toLowerCase()}` },
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
        <span className="text-neutral-700">Escolas em {ufUpper}</span>
      </nav>

      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">Escolas em {ufUpper}</h1>
      <p className="mb-6 max-w-2xl text-neutral-600">
        {result.totalCount} escolas ativas em {municipalities.length} cidades.{" "}
        <Link href={`/escolas?uf=${ufUpper}`} className="font-medium text-primary-700 hover:underline">
          Buscar com filtros
        </Link>
        .
      </p>

      {municipalities.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">Cidades</h2>
          <div className="flex flex-wrap gap-2">
            {municipalities.map((municipality) => (
              <Link
                key={municipality.slug}
                href={`/escolas/${uf.toLowerCase()}/${municipality.slug}`}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-primary-300 hover:text-primary-700"
              >
                {municipality.name} <span className="text-neutral-400">({municipality.schoolCount})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">Escolas em destaque</h2>
        {result.schools.length === 0 ? (
          <EmptyState title="Nenhuma escola encontrada" description="Ainda não há escolas ativas cadastradas." />
        ) : (
          <>
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
                basePath={`/escolas/${uf.toLowerCase()}`}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
