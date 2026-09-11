import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type CampaignEntityType = Database["public"]["Enums"]["campaign_entity_type"];
export type CampaignStatus = Database["public"]["Enums"]["campaign_status"];

export interface AdminCampaign {
  id: string;
  entityType: CampaignEntityType;
  entityId: string;
  entityName: string;
  startsAt: string;
  endsAt: string;
  priority: number;
  status: CampaignStatus;
}

/**
 * campaigns.entity_id is polymorphic (SCHOOL or STORE, no FK possible
 * across two tables) -- resolved here with two batched lookups instead
 * of a Postgrest embed, which only works for a real foreign key.
 */
export async function getAdminCampaigns(): Promise<AdminCampaign[]> {
  const supabase = await createClient();

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, entity_type, entity_id, starts_at, ends_at, priority, status")
    .order("starts_at", { ascending: false });

  if (error) throw new Error(`getAdminCampaigns failed: ${error.message}`);
  if (!campaigns || campaigns.length === 0) return [];

  const schoolIds = campaigns.filter((c) => c.entity_type === "SCHOOL").map((c) => c.entity_id);
  const storeIds = campaigns.filter((c) => c.entity_type === "STORE").map((c) => c.entity_id);

  const [schoolsResult, storesResult] = await Promise.all([
    schoolIds.length > 0
      ? supabase.from("schools").select("id, name").in("id", schoolIds)
      : Promise.resolve({ data: [], error: null }),
    storeIds.length > 0
      ? supabase.from("stores").select("id, name").in("id", storeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const namesById = new Map<string, string>();
  for (const row of schoolsResult.data ?? []) namesById.set(row.id, row.name);
  for (const row of storesResult.data ?? []) namesById.set(row.id, row.name);

  return campaigns.map((c) => ({
    id: c.id,
    entityType: c.entity_type,
    entityId: c.entity_id,
    entityName: namesById.get(c.entity_id) ?? "(não encontrado)",
    startsAt: c.starts_at,
    endsAt: c.ends_at,
    priority: c.priority,
    status: c.status,
  }));
}
