import { searchSchools, type SortMode } from "@/lib/schools/search-schools";
import { recordAnalyticsEvent, recordSchoolImpressions } from "@/lib/analytics/record-event";
import { SchoolCard } from "@/components/schools/school-card";
import { ResultsFilters } from "@/components/schools/results-filters";
import { ResultsMap } from "@/components/schools/results-map";
import { LocationBanner } from "@/components/schools/location-banner";
import { PaginationControls } from "@/components/schools/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";
import type { Database } from "@/lib/supabase/database.types";

interface EscolasPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

const SORT_MODES: SortMode[] = ["relevance", "proximity", "popularity", "rating"];

export default async function EscolasPage({ searchParams }: EscolasPageProps) {
  const params = await searchParams;

  const uf = params.uf || "MT";
  const lat = params.lat ? Number(params.lat) : undefined;
  const lon = params.lon ? Number(params.lon) : undefined;
  const hasLocation = Boolean(lat && lon) || Boolean(params.municipality) || Boolean(params.cep);
  const hasQuery = Boolean(params.q?.trim());
  const sort = SORT_MODES.includes(params.sort as SortMode) ? (params.sort as SortMode) : "relevance";

  const result = await searchSchools({
    uf,
    lat,
    lon,
    municipality: params.municipality,
    cep: params.cep,
    q: params.q,
    schoolType: params.type as Database["public"]["Enums"]["school_type"] | undefined,
    educationLevel: params.level,
    minRating: params.rating ? Number(params.rating) : undefined,
    sort,
    page: params.page ? Number(params.page) : 1,
  });

  // Analytics is best-effort (RF-015) -- never awaited, never allowed to
  // fail or slow down the page render.
  void recordAnalyticsEvent({
    eventType: "school_search",
    metadata: { q: params.q ?? null, uf, sort, page: result.page, resultCount: result.schools.length },
  });
  if (result.schools.length > 0) {
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

      <LocationBanner label={locationLabel} hasLocation={hasLocation || hasQuery} />

      <div className="mt-4">
        <ResultsFilters />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          {result.schools.length === 0 ? (
            <EmptyState
              title="Nenhuma escola encontrada"
              description="Tente ajustar os filtros, a localização ou o termo de busca."
            />
          ) : (
            <>
              <p className="mb-3 text-sm text-neutral-500">{result.totalCount} escolas encontradas</p>
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
    </div>
  );
}
