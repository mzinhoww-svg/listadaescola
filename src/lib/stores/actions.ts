"use server";

import { createPublicClient } from "@/lib/supabase/public";
import { getNearbyStores, type NearbyStore } from "@/lib/stores/nearby-stores";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";

/**
 * Fetched on-demand when the "Comprar local" sheet opens, not eagerly
 * with the lista page: ties `store_view` to an actual view instead of
 * every page load, and skips the proximity query for visitors who never
 * open it.
 */
export async function getNearbyStoresForSchoolAction(schoolId: string, listId: string): Promise<NearbyStore[]> {
  const supabase = createPublicClient();
  const { data: school } = await supabase
    .from("schools")
    .select("uf, municipality, latitude, longitude")
    .eq("id", schoolId)
    .maybeSingle();

  if (!school) return [];

  const stores = await getNearbyStores({
    uf: school.uf,
    lat: school.latitude,
    lon: school.longitude,
    municipality: school.municipality,
  });

  // Best-effort (RF-015), same pattern as recordSchoolImpressions: never
  // blocks the sheet from opening.
  void Promise.all(
    stores.map((store) => recordAnalyticsEvent({ eventType: "store_view", schoolId, storeId: store.id, listId }))
  );

  return stores;
}
