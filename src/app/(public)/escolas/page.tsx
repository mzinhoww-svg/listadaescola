import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";

import { searchSchools, type SortMode } from "@/lib/schools/search-schools";
import { getPublishedReviewCount } from "@/lib/reviews/stats";
import { recordAnalyticsEvent, recordSchoolImpressions } from "@/lib/analytics/record-event";
import { SchoolCard } from "@/components/schools/school-card";
import { ResultsFilters } from "@/components/schools/results-filters";
import { ResultsMap } from "@/components/schools/results-map";
import { LocationBanner } from "@/components/schools/location-banner";
import { PaginationControls } from "@/components/schools/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { CatalogLanding } from "@/components/schools/catalog-landing";
import { buildResultsUrl } from "@/lib/schools/results-url";
import type { Database } from "@/lib/supabase/database.types";
import { OG_DEFAULTS } from "@/lib/seo/metadata";
import { slugify } from "@/lib/utils";

interface EscolasPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const SORT_MODES: SortMode[] = ["relevance", "proximity", "popularity", "rating"];

/**
 * `lat`/`lon`/`cep`/`label` are geolocation-derived/ephemeral, `sort`/
 * `page` don't change the result set's identity -- none belong in a
 * canonical URL. `q` (free-text search) has no dedicated landing page, so
 * it canonicalizes to the plain search entry point. `uf`/`municipality`
 * now DO have one each (Prompt 15's new /escolas/[uf] and
 * /escolas/[uf]/[cidade] routes) -- canonicalizing to them there instead
 * of self-referencing avoids indexing /escolas as a near-duplicate of
 * every one of those pages.
 */
function buildCanonical(params: Record<string, string | undefined>): string {
  const uf = (params.uf || "MT").toLowerCase();
  if (params.q?.trim()) return "/escolas";
  if (params.municipality?.trim()) return `/escolas/${uf}/${slugify(params.municipality)}`;
  return `/escolas/${uf}`;
}

export async function generateMetadata({ searchParams }: EscolasPageProps): Promise<Metadata> {
  const params = await searchParams;
  const uf = params.uf || "MT";

  let title = "Escolas";
  let description = `Encontre escolas em ${uf} por cidade, CEP ou nome e veja as listas de material escolar.`;
  if (params.q?.trim()) {
    title = `Busca: "${params.q.trim()}"`;
    description = `Resultados para "${params.q.trim()}" entre as escolas de ${uf}.`;
  } else if (params.municipality?.trim()) {
    title = `Escolas em ${params.municipality.trim()}`;
    description = `Escolas ativas em ${params.municipality.trim()}, ${uf}, com listas de material escolar.`;
  }

  return {
    title,
    description,
    alternates: { canonical: buildCanonical(params) },
    openGraph: { ...OG_DEFAULTS, title, description, type: "website" },
  };
}

export default async function EscolasPage({ searchParams }: EscolasPageProps) {
  const params = await searchParams;

  const uf = params.uf || "MT";
  const lat = params.lat ? Number(params.lat) : undefined;
  const lon = params.lon ? Number(params.lon) : undefined;
  const hasLocation = Boolean(lat && lon) || Boolean(params.municipality) || Boolean(params.cep);
  const hasQuery = Boolean(params.q?.trim());
  const sort = SORT_MODES.includes(params.sort as SortMode) ? (params.sort as SortMode) : "relevance";
  // Onda 2 P3: "com" | "sem" na URL -> true | false | undefined no RPC.
  const hasList = params.lista === "com" ? true : params.lista === "sem" ? false : undefined;

  /*
   * Onda 2 P2: sem nenhum escopo, a busca devolvia as 2.722 escolas de MT em
   * ordem alfabética -- página 1 de 137, uma sequência de APAEs de 17
   * municípios diferentes. Para quem chega pelo header ou por SEO, esse era o
   * primeiro contato com o produto, e parecia um dump de banco. Um filtro
   * sozinho (tipo/etapa/lista) também é escopo: quem escolheu "Com lista
   * publicada" quer ver o resultado, não um seletor de cidade.
   */
  const hasAnyFilter = Boolean(params.type || params.level || params.rating || params.lista);
  const hasScope = hasLocation || hasQuery || hasAnyFilter;

  /*
    Onda 9. O filtro "Avaliação mínima" e a ordenação "Avaliação" operam
    sobre `avg_rating`, que search_schools devolve como
    `coalesce(r.avg_rating, 0)`. Com 0 avaliações publicadas -- o estado
    real hoje --, "4+ estrelas" leva 2.722 escolas reais a zero resultados,
    e a tela respondia "Nenhuma escola encontrada / tente ajustar os
    filtros, a localização ou o termo de busca", que atribui às escolas um
    problema que é do catálogo. Saber o total permite desabilitar os
    controles dizendo o motivo e, para quem chegar por link antigo,
    explicar a causa verdadeira.

    Em paralelo com a busca, não antes: esta é a página pública mais quente
    do produto e a contagem não é entrada de nenhum parâmetro da busca.
  */
  const [publishedReviewCount, result] = await Promise.all([
    getPublishedReviewCount(),
    hasScope
      ? searchSchools({
          uf,
          lat,
          lon,
          municipality: params.municipality,
          cep: params.cep,
          q: params.q,
          schoolType: params.type as Database["public"]["Enums"]["school_type"] | undefined,
          educationLevel: params.level,
          minRating: params.rating ? Number(params.rating) : undefined,
          hasList,
          sort,
          page: params.page ? Number(params.page) : 1,
        })
      : Promise.resolve(null),
  ]);
  const ratingFilterIsTheCause = Boolean(params.rating) && publishedReviewCount === 0;

  // Analytics is best-effort (RF-015) -- never awaited, never allowed to
  // fail or slow down the page render.
  if (result) {
    void recordAnalyticsEvent({
      eventType: "school_search",
      metadata: { q: params.q ?? null, uf, sort, page: result.page, resultCount: result.schools.length },
    });
  }
  if (result && result.schools.length > 0) {
    void recordSchoolImpressions(
      result.schools.map((school) => school.id),
      { page: result.page, sort }
    );
  }

  const linkParams = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
  const locationLabel = params.label ?? params.municipality ?? (hasQuery ? `"${params.q}"` : null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 text-2xl font-semibold text-neutral-900">Escolas</h1>

      <LocationBanner
        label={locationLabel}
        hasLocation={hasLocation || hasQuery}
        mode={!hasLocation && hasQuery ? "query" : "location"}
      />

      <div className="mt-4">
        <ResultsFilters publishedReviewCount={publishedReviewCount} />
      </div>

      {!result ? (
        <CatalogLanding uf={uf} />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            {result.schools.length === 0 ? (
              ratingFilterIsTheCause ? (
                <EmptyState
                  icon={Star}
                  title="Ainda não há avaliações no Listada"
                  description="Nenhuma escola foi avaliada até agora, então filtrar por nota mínima não devolve nenhuma. Isso não diz nada sobre as escolas de MT — diz que ninguém avaliou ainda. Tire o filtro de avaliação para ver o catálogo completo."
                  action={
                    <Button asChild variant="outline">
                      {/* Tira também `sort=rating`, que sem avaliação nenhuma
                          ordena 2.722 zeros empatados. */}
                      <Link
                        href={buildResultsUrl(linkParams, {
                          rating: null,
                          ...(params.sort === "rating" ? { sort: null } : {}),
                        })}
                      >
                        Ver sem o filtro de avaliação
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="Nenhuma escola encontrada"
                  description="Tente ajustar os filtros, a localização ou o termo de busca. Se a escola que você procura não está no cadastro do INEP, você pode sugeri-la."
                  action={
                    <Button asChild variant="outline">
                      <Link href="/sugerir-escola">Sugerir uma escola</Link>
                    </Button>
                  }
                />
              )
            ) : (
              <>
                <h2 className="mb-3 text-sm text-neutral-500">{result.totalCount} escolas encontradas</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {result.schools.map((school) => (
                    <SchoolCard key={school.id} school={school} />
                  ))}
                </div>
                <div className="mt-6">
                  <PaginationControls page={result.page} pageCount={result.pageCount} searchParams={linkParams} />
                </div>
              </>
            )}
          </div>
          <div className="lg:sticky lg:top-4 lg:h-fit">
            <ResultsMap schools={result.schools} center={lat !== undefined && lon !== undefined ? { lat, lon } : null} />
          </div>
        </div>
      )}
    </div>
  );
}
