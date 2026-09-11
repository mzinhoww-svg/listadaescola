import { createPublicClient } from "@/lib/supabase/public";
import type { SchoolResult } from "@/lib/schools/search-schools";

/**
 * Home "destaques": schools that actually earned a highlight (sponsored
 * campaign or admin-verified) -- never an arbitrary sample dressed up as
 * curated. Returns [] today because no campaign/verification exists yet
 * in this fresh MT dataset (0 rows in school_profiles); that's the
 * correct, honest result for a pre-launch MVP, not a bug -- the caller
 * hides the section entirely rather than show a fabricated highlight.
 */
export async function getFeaturedSchools(uf = "MT", limit = 4): Promise<SchoolResult[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("search_schools", {
    p_uf: uf,
    p_sort: "popularity",
    p_limit: 50,
  });
  if (error) throw new Error(`getFeaturedSchools failed: ${error.message}`);
  return (data ?? []).filter((school) => school.is_sponsored || school.is_verified).slice(0, limit);
}

export interface RecentList {
  id: string;
  slug: string;
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  publishedAt: string;
  school: { id: string; name: string; slug: string; municipality: string; uf: string };
}

/**
 * Home "listas recentes": only lists with a PUBLISHED version (the same
 * bar school_list_versions_select_published RLS enforces for anyone).
 * Returns [] today -- school_lists has 0 rows in this fresh dataset, no
 * contribution has been approved yet (Prompt 10/11 build that flow).
 */
export async function getRecentLists(uf = "MT", limit = 4): Promise<RecentList[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("school_list_versions")
    .select(
      `id, published_at,
       school_lists!inner (id, slug, education_level, series_name, school_year, status,
         schools!inner (id, name, slug, municipality, uf, is_active))`
    )
    .eq("status", "PUBLISHED")
    .eq("school_lists.status", "APPROVED")
    .eq("school_lists.schools.uf", uf)
    .eq("school_lists.schools.is_active", true)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRecentLists failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const list = row.school_lists;
    const school = list.schools;
    return {
      id: row.id,
      slug: list.slug,
      educationLevel: list.education_level,
      seriesName: list.series_name,
      schoolYear: list.school_year,
      publishedAt: row.published_at,
      school: { id: school.id, name: school.name, slug: school.slug, municipality: school.municipality, uf: school.uf },
    };
  });
}
