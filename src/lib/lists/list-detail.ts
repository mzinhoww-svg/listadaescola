import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/supabase/database.types";

export interface ListDetailSchool {
  id: string;
  name: string;
  slug: string;
  uf: string;
  municipality: string;
}

export interface ListDetail {
  id: string;
  slug: string;
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  school: ListDetailSchool;
  versionId: string;
  versionNumber: number;
  publishedAt: string;
  items: Database["public"]["Tables"]["school_list_items"]["Row"][];
}

/**
 * Two round trips, no N+1: (1) resolve the list by slug, joined to its
 * school for the breadcrumb; (2) resolve the current version (highest
 * version_number among status='PUBLISHED' -- approve_submission() never
 * archives a superseded version, so more than one PUBLISHED version can
 * exist for the same list; the latest one is "the" public version) with
 * its items embedded in the same query.
 *
 * Public visibility requires BOTH: school_lists.status = 'APPROVED' *and*
 * a school_list_versions row with status = 'PUBLISHED' (RN-006). Either
 * missing resolves to `null` -> the page 404s rather than showing a list
 * with no content.
 */
export const getListBySlug = cache(async (slug: string): Promise<ListDetail | null> => {
  const supabase = createPublicClient();

  const { data: list, error: listError } = await supabase
    .from("school_lists")
    .select(
      `id, slug, education_level, series_name, school_year,
       schools!inner (id, name, slug, uf, municipality, is_active)`
    )
    .eq("slug", slug)
    .eq("status", "APPROVED")
    .eq("schools.is_active", true)
    .maybeSingle();

  if (listError) throw new Error(`getListBySlug failed: ${listError.message}`);
  if (!list) return null;

  const { data: version, error: versionError } = await supabase
    .from("school_list_versions")
    .select(`id, version_number, published_at, school_list_items (*)`)
    .eq("school_list_id", list.id)
    .eq("status", "PUBLISHED")
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (versionError) throw new Error(`getListBySlug (version) failed: ${versionError.message}`);
  if (!version) return null;

  const items = [...version.school_list_items].sort((a, b) => a.sort_order - b.sort_order);

  return {
    id: list.id,
    slug: list.slug,
    educationLevel: list.education_level,
    seriesName: list.series_name,
    schoolYear: list.school_year,
    school: list.schools,
    versionId: version.id,
    versionNumber: version.version_number,
    publishedAt: version.published_at,
    items,
  };
});

export interface PublicListCard {
  id: string;
  slug: string;
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  updatedAt: string;
  school: { name: string; slug: string; uf: string; municipality: string };
}

export interface PublicListsPage {
  items: PublicListCard[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

const LISTS_PAGE_SIZE = 20;

/**
 * Prompt 20 (gap analysis): `/listas` plain listing was in the PRD
 * sitemap but never built. Same public-visibility rule as getListBySlug
 * (RN-006: APPROVED + a PUBLISHED version + active school).
 *
 * `count: "exact"` counts matched rows, not distinct lists -- a list with
 * more than one PUBLISHED version (approve_submission() never archives a
 * superseded one) is joined once per matching version and de-duped below,
 * so `total`/pageCount can be a small overcount in that rare case. Exact
 * distinct counting would need a dedicated SQL function; not worth it for
 * this listing's priority today.
 */
export async function getPublicLists(page = 1): Promise<PublicListsPage> {
  const supabase = createPublicClient();
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * LISTS_PAGE_SIZE;
  const to = from + LISTS_PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("school_lists")
    .select(
      `id, slug, education_level, series_name, school_year, updated_at,
       schools!inner (name, slug, uf, municipality, is_active),
       school_list_versions!inner (status)`,
      { count: "exact" }
    )
    .eq("status", "APPROVED")
    .eq("schools.is_active", true)
    .eq("school_list_versions.status", "PUBLISHED")
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(`getPublicLists failed: ${error.message}`);

  const seen = new Set<string>();
  const items = (data ?? []).filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  return {
    items: items.map((row) => ({
      id: row.id,
      slug: row.slug,
      educationLevel: row.education_level,
      seriesName: row.series_name,
      schoolYear: row.school_year,
      updatedAt: row.updated_at,
      school: row.schools,
    })),
    total: count ?? 0,
    page: safePage,
    pageSize: LISTS_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil((count ?? 0) / LISTS_PAGE_SIZE)),
  };
}
