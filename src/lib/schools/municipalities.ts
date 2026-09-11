import { createPublicClient } from "@/lib/supabase/public";
import { slugify } from "@/lib/utils";

export interface MunicipalityOption {
  name: string;
  slug: string;
  schoolCount: number;
}

/**
 * Estado/cidade landing pages (Prompt 15, PRD §14) -- /escolas/[uf] needs a
 * list of cities worth linking to, /escolas/[uf]/[cidade] needs to turn its
 * URL slug back into the real municipality name to actually filter by
 * (unlike the school detail page's [uf]/[cidade] segments, which are
 * cosmetic-only and never used to query). Both wrap the same
 * SECURITY INVOKER RPCs (20260911190000_seo.sql) -- no RLS to bypass,
 * public data.
 */
export async function listMunicipalities(uf: string): Promise<MunicipalityOption[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("list_municipalities", { p_uf: uf });
  if (error) throw new Error(`listMunicipalities failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    name: row.municipality,
    slug: slugify(row.municipality),
    schoolCount: Number(row.school_count),
  }));
}

export async function resolveMunicipalitySlug(uf: string, citySlug: string): Promise<string | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("resolve_municipality_slug", { p_uf: uf, p_slug: citySlug });
  if (error) throw new Error(`resolveMunicipalitySlug failed: ${error.message}`);
  return data;
}
