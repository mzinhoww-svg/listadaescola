import { createPublicClient } from "@/lib/supabase/public";
import { normalizeWhatsappNumber } from "@/lib/stores/whatsapp";

export interface NearbyStore {
  id: string;
  name: string;
  slug: string;
  uf: string;
  municipality: string;
  address: string | null;
  /** Already validated/normalized (RF-012) -- null when the stored number can't be trusted, so the UI never renders a dead WhatsApp CTA. */
  whatsappNormalized: string | null;
  openingHours: string | null;
  offersDelivery: boolean;
  offersPickup: boolean;
  /** Distance to the anchor escola's own location, never a visitor's -- null in every fallback path (RN-009). */
  distanceKm: number | null;
}

export interface NearbyStoresParams {
  uf: string;
  lat: number | null;
  lon: number | null;
  municipality: string;
  radiusKm?: number;
  limit?: number;
}

/** Server-only wrapper around nearby_stores() (Prompt 09). Cookie-less: same rows are visible to anon and authenticated (stores_select_active). */
export async function getNearbyStores({
  uf,
  lat,
  lon,
  municipality,
  radiusKm = 20,
  limit = 10,
}: NearbyStoresParams): Promise<NearbyStore[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("nearby_stores", {
    p_uf: uf,
    p_lat: lat ?? undefined,
    p_lon: lon ?? undefined,
    p_municipality: municipality,
    p_radius_km: radiusKm,
    p_limit: limit,
  });

  if (error) throw new Error(`getNearbyStores failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    uf: row.uf,
    municipality: row.municipality,
    address: row.address,
    whatsappNormalized: normalizeWhatsappNumber(row.whatsapp),
    openingHours: row.opening_hours,
    offersDelivery: row.offers_delivery,
    offersPickup: row.offers_pickup,
    distanceKm: row.distance_km,
  }));
}
