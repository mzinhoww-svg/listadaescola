import { createPublicClient } from "@/lib/supabase/public";

export interface NearbySchool {
  id: string;
  name: string;
  slug: string;
  uf: string;
  municipality: string;
  /** Distance from the anchor location (a store, here) -- null in every fallback path (RN-009, never fabricated). */
  distanceKm: number | null;
}

export interface NearbySchoolsParams {
  uf: string;
  lat: number | null;
  lon: number | null;
  municipality: string;
  radiusKm?: number;
  limit?: number;
}

/** Server-only wrapper around nearby_schools() -- same shape as
 * getNearbyStores() (nearby-stores.ts), reversed: used from a store's
 * location to surface schools in the same area (papelaria profile
 * cross-link), never the other way around. */
export async function getNearbySchools({
  uf,
  lat,
  lon,
  municipality,
  radiusKm = 20,
  limit = 5,
}: NearbySchoolsParams): Promise<NearbySchool[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("nearby_schools", {
    p_uf: uf,
    p_lat: lat ?? undefined,
    p_lon: lon ?? undefined,
    p_municipality: municipality,
    p_radius_km: radiusKm,
    p_limit: limit,
  });

  if (error) throw new Error(`getNearbySchools failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    uf: row.uf,
    municipality: row.municipality,
    distanceKm: row.distance_km,
  }));
}
