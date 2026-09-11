import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type FavoriteTargetType = Database["public"]["Enums"]["favorite_target_type"];

/**
 * Cookie-aware (needs auth.uid()) -- always false for an anonymous
 * visitor, never throws. Used to pass the initial toggle state into
 * <SaveButton> so it renders correctly on first paint without a client
 * round trip.
 */
export async function isFavorited(targetType: FavoriteTargetType, targetId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("favorites")
    .select("id")
    .eq("profile_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  return Boolean(data);
}
