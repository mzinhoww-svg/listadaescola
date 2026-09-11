import { createPublicClient } from "@/lib/supabase/public";

const PAGE_SIZE = 1000;

/**
 * Supabase/PostgREST caps a single response at `db-max-rows` (1000 on this
 * project) -- the sitemap needs every row (schools alone is ~2700), so this
 * pages with .range() until a short page signals the end.
 */
async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`sitemap bulk query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export interface SchoolSitemapEntry {
  uf: string;
  municipality: string;
  slug: string;
  updatedAt: string;
}

export async function getAllActiveSchoolEntries(): Promise<SchoolSitemapEntry[]> {
  const supabase = createPublicClient();
  const rows = await fetchAllRows((from, to) =>
    supabase
      .from("schools")
      .select("uf, municipality, slug, updated_at")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, to)
  );
  return rows.map((row) => ({
    uf: row.uf,
    municipality: row.municipality,
    slug: row.slug,
    updatedAt: row.updated_at,
  }));
}

export interface StoreSitemapEntry {
  uf: string;
  municipality: string;
  slug: string;
  updatedAt: string;
}

export async function getAllActiveStoreEntries(): Promise<StoreSitemapEntry[]> {
  const supabase = createPublicClient();
  const rows = await fetchAllRows((from, to) =>
    supabase
      .from("stores")
      .select("uf, municipality, slug, updated_at")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, to)
  );
  return rows.map((row) => ({
    uf: row.uf,
    municipality: row.municipality,
    slug: row.slug,
    updatedAt: row.updated_at,
  }));
}

export interface ListSitemapEntry {
  slug: string;
  updatedAt: string;
}

/**
 * Public visibility mirrors getListBySlug (RN-006): school_lists.status =
 * 'APPROVED' AND a school_list_versions row with status = 'PUBLISHED' AND
 * the parent school is_active. A list can have more than one PUBLISHED
 * version (approve_submission() never archives a superseded one), so a
 * page of this inner-joined query can repeat the same slug -- de-duped
 * below.
 */
export async function getAllPublicListEntries(): Promise<ListSitemapEntry[]> {
  const supabase = createPublicClient();
  const rows = await fetchAllRows((from, to) =>
    supabase
      .from("school_lists")
      .select("slug, updated_at, schools!inner(is_active), school_list_versions!inner(status)")
      .eq("status", "APPROVED")
      .eq("schools.is_active", true)
      .eq("school_list_versions.status", "PUBLISHED")
      .order("id", { ascending: true })
      .range(from, to)
  );

  const bySlug = new Map<string, string>();
  for (const row of rows) {
    if (!bySlug.has(row.slug)) bySlug.set(row.slug, row.updated_at);
  }
  return [...bySlug.entries()].map(([slug, updatedAt]) => ({ slug, updatedAt }));
}
