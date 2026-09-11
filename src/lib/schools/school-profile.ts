import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import { EDUCATION_LEVELS } from "@/lib/schools/search-schools";
import type { Database } from "@/lib/supabase/database.types";

export type SchoolProfile = Database["public"]["Tables"]["schools"]["Row"] & {
  school_profiles: Database["public"]["Tables"]["school_profiles"]["Row"] | null;
  school_contacts: Database["public"]["Tables"]["school_contacts"]["Row"][];
  school_images: Database["public"]["Tables"]["school_images"]["Row"][];
  school_education_levels: Database["public"]["Tables"]["school_education_levels"]["Row"][];
  school_series: Database["public"]["Tables"]["school_series"]["Row"][];
};

/**
 * Single round trip for the whole profile page: schools + every child
 * table it needs, via PostgREST embedding over the existing FKs. RLS
 * already restricts each embedded table to its public rows (active
 * school, is_public contacts, is_approved images) -- the explicit
 * is_active filter here just makes a deactivated/unknown slug resolve to
 * `null` (-> notFound()) instead of relying solely on RLS to hide it.
 */
export const getSchoolBySlug = cache(async (slug: string): Promise<SchoolProfile | null> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("schools")
    .select(
      `*,
       school_profiles (*),
       school_contacts (*),
       school_images (*),
       school_education_levels (*),
       school_series (*)`
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`getSchoolBySlug failed: ${error.message}`);
  return data;
});

export interface SchoolListSummary {
  id: string;
  slug: string;
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
}

/** Only APPROVED rows are visible to anon (school_lists_select_approved). */
export async function getSchoolLists(schoolId: string): Promise<SchoolListSummary[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("school_lists")
    .select("id, slug, education_level, series_name, school_year")
    .eq("school_id", schoolId)
    .eq("status", "APPROVED")
    .order("series_name")
    .order("school_year", { ascending: false });

  if (error) throw new Error(`getSchoolLists failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    educationLevel: row.education_level,
    seriesName: row.series_name,
    schoolYear: row.school_year,
  }));
}

export interface SerieGroup {
  serieName: string;
  lists: SchoolListSummary[];
}

export interface EtapaGroup {
  etapa: string;
  series: SerieGroup[];
}

function sortEtapas(etapas: string[]): string[] {
  const known = EDUCATION_LEVELS as readonly string[];
  return [...etapas].sort((a, b) => {
    const ia = known.indexOf(a);
    const ib = known.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, "pt-BR");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/**
 * Groups etapa -> série -> anos (listas) for the "seleção de série/ano"
 * flow (Prompt 07). `school_series` (structural: which séries a school
 * teaches) and `school_lists` (a série only becomes navigable once a list
 * for some ano letivo exists) are kept as distinct concepts per the
 * prompt: a série declared in school_series but with zero published
 * lists still shows up here, honestly, with an empty `lists` array --
 * never fabricated, never hidden.
 */
export function groupEtapasSeriesListas(
  series: Pick<Database["public"]["Tables"]["school_series"]["Row"], "education_level" | "series_name">[],
  lists: SchoolListSummary[]
): EtapaGroup[] {
  const bySerie = new Map<string, Map<string, SchoolListSummary[]>>();

  function ensure(etapa: string, serie: string) {
    if (!bySerie.has(etapa)) bySerie.set(etapa, new Map());
    const serieMap = bySerie.get(etapa)!;
    if (!serieMap.has(serie)) serieMap.set(serie, []);
    return serieMap.get(serie)!;
  }

  for (const s of series) ensure(s.education_level, s.series_name);
  for (const list of lists) ensure(list.educationLevel, list.seriesName).push(list);

  const etapas = sortEtapas(Array.from(bySerie.keys()));
  return etapas.map((etapa) => {
    const serieMap = bySerie.get(etapa)!;
    const serieNames = Array.from(serieMap.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"));
    return {
      etapa,
      series: serieNames.map((serieName) => ({
        serieName,
        lists: [...serieMap.get(serieName)!].sort((a, b) => b.schoolYear - a.schoolYear),
      })),
    };
  });
}
