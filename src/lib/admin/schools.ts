import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;

export interface AdminSchoolListItem {
  id: string;
  inepCode: string;
  name: string;
  municipality: string;
  uf: string;
  isActive: boolean;
  isVerified: boolean;
}

export interface AdminSchoolsPage {
  items: AdminSchoolListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminSchoolsFilters {
  query?: string;
  municipality?: string;
  status?: "active" | "inactive";
  page?: number;
}

/**
 * Admin-only listing -- ALL schools (active and inactive), unlike
 * search_schools() which is the public-facing, active-only, ranked
 * search. Uses the same trigram/uf+municipality indexes as that function
 * (schools_name_trgm, schools_uf_municipality_idx), just without its
 * distance/rating/sponsorship scoring -- an admin table doesn't need any
 * of that, only find-and-edit.
 */
export async function getAdminSchools(filters: AdminSchoolsFilters = {}): Promise<AdminSchoolsPage> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let queryBuilder = supabase
    .from("schools")
    .select("id, inep_code, name, municipality, uf, is_active, school_profiles (is_verified)", { count: "exact" })
    .order("name", { ascending: true })
    .range(from, to);

  if (filters.query) {
    queryBuilder = queryBuilder.ilike("name", `%${filters.query}%`);
  }
  if (filters.municipality) {
    queryBuilder = queryBuilder.eq("municipality", filters.municipality);
  }
  if (filters.status === "active") {
    queryBuilder = queryBuilder.eq("is_active", true);
  } else if (filters.status === "inactive") {
    queryBuilder = queryBuilder.eq("is_active", false);
  }

  const { data, error, count } = await queryBuilder;
  if (error) throw new Error(`getAdminSchools failed: ${error.message}`);

  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      inepCode: row.inep_code,
      name: row.name,
      municipality: row.municipality,
      uf: row.uf,
      isActive: row.is_active,
      isVerified: row.school_profiles?.is_verified ?? false,
    })),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export interface AdminSchoolDetail {
  id: string;
  inepCode: string;
  name: string;
  slug: string;
  municipality: string;
  uf: string;
  address: string | null;
  schoolType: string;
  isActive: boolean;
  source: string;
  profile: {
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    instagram: string | null;
    whatsapp: string | null;
    isVerified: boolean;
  };
}

/** Admin-only (route already gated; schools_admin_all RLS is the real
 * backstop). Used to prefill the edit form -- INEP-controlled fields are
 * shown read-only, never sent back through admin_update_school (see that
 * function's own comment for why). */
export const getAdminSchoolDetail = cache(async (schoolId: string): Promise<AdminSchoolDetail | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("schools")
    .select(
      `id, inep_code, name, slug, municipality, uf, address, school_type, is_active, source,
       school_profiles (description, logo_url, website, instagram, whatsapp, is_verified)`
    )
    .eq("id", schoolId)
    .maybeSingle();

  if (error) throw new Error(`getAdminSchoolDetail failed: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    inepCode: data.inep_code,
    name: data.name,
    slug: data.slug,
    municipality: data.municipality,
    uf: data.uf,
    address: data.address,
    schoolType: data.school_type,
    isActive: data.is_active,
    source: data.source,
    profile: {
      description: data.school_profiles?.description ?? null,
      logoUrl: data.school_profiles?.logo_url ?? null,
      website: data.school_profiles?.website ?? null,
      instagram: data.school_profiles?.instagram ?? null,
      whatsapp: data.school_profiles?.whatsapp ?? null,
      isVerified: data.school_profiles?.is_verified ?? false,
    },
  };
});
