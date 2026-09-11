import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export interface AdminListItem {
  id: string;
  status: string;
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  currentVersion: number | null;
  itemCount: number;
  publishedAt: string | null;
  school: { name: string; municipality: string };
}

/**
 * Read-only overview -- creation/versioning of school_lists content stays
 * exclusively via approve_submission() (see that function's header
 * comment); this only lists what exists today so admin can review/archive
 * it. "Versão atual" is the highest version_number that isn't itself
 * archived, since admin_set_school_list_status only ever flips the
 * list-level status, not per-version status.
 */
export async function getAdminLists(): Promise<AdminListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("school_lists")
    .select(
      `id, status, education_level, series_name, school_year,
       schools!inner (name, municipality),
       school_list_versions (version_number, status, published_at, school_list_items (id))`
    )
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`getAdminLists failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const versions = [...row.school_list_versions].sort((a, b) => b.version_number - a.version_number);
    const latest = versions[0] ?? null;
    return {
      id: row.id,
      status: row.status,
      educationLevel: row.education_level,
      seriesName: row.series_name,
      schoolYear: row.school_year,
      currentVersion: latest?.version_number ?? null,
      itemCount: latest?.school_list_items.length ?? 0,
      publishedAt: latest?.published_at ?? null,
      school: row.schools,
    };
  });
}

export interface AdminListVersion {
  id: string;
  versionNumber: number;
  status: string;
  publishedAt: string;
  items: { id: string; name: string; quantity: number; unit: string | null; brand: string | null; isRequired: boolean }[];
}

export interface AdminListDetail {
  id: string;
  status: string;
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  school: { id: string; name: string; municipality: string; uf: string };
  versions: AdminListVersion[];
}

export const getAdminListDetail = cache(async (schoolListId: string): Promise<AdminListDetail | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("school_lists")
    .select(
      `id, status, education_level, series_name, school_year,
       schools!inner (id, name, municipality, uf),
       school_list_versions (id, version_number, status, published_at, school_list_items (id, name, quantity, unit, brand, is_required))`
    )
    .eq("id", schoolListId)
    .maybeSingle();

  if (error) throw new Error(`getAdminListDetail failed: ${error.message}`);
  if (!data) return null;

  const versions = [...data.school_list_versions]
    .sort((a, b) => b.version_number - a.version_number)
    .map((version) => ({
      id: version.id,
      versionNumber: version.version_number,
      status: version.status,
      publishedAt: version.published_at,
      items: [...version.school_list_items]
        .map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          brand: item.brand,
          isRequired: item.is_required,
        })),
    }));

  return {
    id: data.id,
    status: data.status,
    educationLevel: data.education_level,
    seriesName: data.series_name,
    schoolYear: data.school_year,
    school: data.schools,
    versions,
  };
});
