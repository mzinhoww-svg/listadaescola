import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/supabase/database.types";

type CampaignEntityType = Database["public"]["Enums"]["campaign_entity_type"];

/**
 * Live sponsorship check for a single school/store, via the
 * `is_entity_sponsored()` RPC (SECURITY DEFINER -- campaigns has no public
 * RLS policy, see the migration for why). search_schools()/nearby_schools()
 * already compute sponsorship this way for listings; profile pages used to
 * read the static, never-updated `is_sponsored` column on
 * schools/school_profiles/stores instead, so a school with a real active
 * campaign showed "PATROCINADA" everywhere except its own page. Use this
 * wherever a single entity's sponsorship needs checking outside a listing
 * RPC that already returns it.
 */
export async function isEntitySponsored(entityType: CampaignEntityType, entityId: string): Promise<boolean> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("is_entity_sponsored", {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw new Error(`isEntitySponsored failed: ${error.message}`);
  return data ?? false;
}
