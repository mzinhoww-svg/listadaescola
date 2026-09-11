import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/supabase/database.types";

export type SchoolResult = Database["public"]["Functions"]["search_schools"]["Returns"][number];

export type SortMode = "relevance" | "proximity" | "popularity" | "rating";

export const EDUCATION_LEVELS = [
  "Educação Infantil",
  "Ensino Fundamental",
  "Ensino Médio",
  "Educação Profissional",
  "Educação de Jovens Adultos",
] as const;

export const PAGE_SIZE = 20;

export interface SearchSchoolsParams {
  uf?: string;
  lat?: number;
  lon?: number;
  municipality?: string;
  cep?: string;
  q?: string;
  radiusKm?: number;
  schoolType?: Database["public"]["Enums"]["school_type"];
  educationLevel?: string;
  minRating?: number;
  sort?: SortMode;
  page?: number;
}

export interface SearchSchoolsResult {
  schools: SchoolResult[];
  totalCount: number;
  page: number;
  pageCount: number;
}

/**
 * Server-only wrapper around search_schools() (Prompt 06). Uses the
 * cookie-less public client since this never depends on who's asking --
 * the same rows are visible to anon and authenticated (schools_select_active).
 */
export async function searchSchools(params: SearchSchoolsParams): Promise<SearchSchoolsResult> {
  const page = Math.max(1, params.page ?? 1);
  const supabase = createPublicClient();

  const { data, error } = await supabase.rpc("search_schools", {
    p_uf: params.uf ?? "MT",
    p_lat: params.lat,
    p_lon: params.lon,
    p_municipality: params.municipality,
    p_cep: params.cep,
    p_name_query: params.q,
    p_radius_km: params.radiusKm,
    p_school_type: params.schoolType,
    p_education_level: params.educationLevel,
    p_min_rating: params.minRating,
    p_sort: params.sort ?? "relevance",
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });

  if (error) throw new Error(`search_schools failed: ${error.message}`);

  const schools = data ?? [];
  const totalCount = schools[0]?.total_count ?? 0;

  return {
    schools,
    totalCount,
    page,
    pageCount: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
  };
}
