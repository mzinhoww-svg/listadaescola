import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type StoreClaimStatus = Database["public"]["Enums"]["submission_status"];

/** Os três estados que o CHECK de `store_claims` permite -- os outros do
 * enum `submission_status` não têm fluxo nesta fila (ver a migration
 * 20260913030000_store_self_service.sql). */
export const STORE_CLAIM_DEFAULT_STATUSES: readonly StoreClaimStatus[] = ["SUBMITTED"];
export const STORE_CLAIM_FILTERABLE_STATUSES: readonly StoreClaimStatus[] = ["SUBMITTED", "APPROVED", "REJECTED"];

export interface StoreClaimQueueItem {
  id: string;
  status: StoreClaimStatus;
  storeName: string;
  municipality: string;
  uf: string;
  isExistingStore: boolean;
  createdAt: string;
  requestedBy: { fullName: string | null };
}

// Mesmo teto das outras filas do admin (ver admin/lists.ts).
const MAX_ROWS = 200;

/** Mais antigas primeiro -- mesma convenção de getModerationQueue e
 * getSchoolSuggestionQueue: é a solicitação esperando há mais tempo, não
 * uma prioridade inventada. */
export async function getStoreClaimQueue(
  statuses: readonly StoreClaimStatus[] = STORE_CLAIM_DEFAULT_STATUSES
): Promise<StoreClaimQueueItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_claims")
    .select(
      `id, status, store_name, municipality, uf, store_id, created_at,
       profiles!store_claims_requester_id_fkey (full_name)`
    )
    .in("status", statuses)
    .order("created_at", { ascending: true })
    .range(0, MAX_ROWS - 1);

  if (error) throw new Error(`getStoreClaimQueue failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    storeName: row.store_name,
    municipality: row.municipality,
    uf: row.uf,
    isExistingStore: row.store_id !== null,
    createdAt: row.created_at,
    requestedBy: { fullName: row.profiles?.full_name ?? null },
  }));
}

export interface StoreClaimDetail {
  id: string;
  status: StoreClaimStatus;
  storeName: string;
  municipality: string;
  uf: string;
  address: string | null;
  whatsapp: string;
  openingHours: string | null;
  offersDelivery: boolean;
  offersPickup: boolean;
  services: string[];
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  requestedBy: { id: string; fullName: string | null };
  reviewedBy: { fullName: string | null } | null;
  /** Papelaria já existente que está sendo reivindicada, quando houver.
   * Depois da aprovação, aponta para a papelaria resultante nos dois
   * casos -- o `status` diz qual dos dois é. */
  linkedStore: { id: string; name: string; slug: string; municipality: string; uf: string; isActive: boolean } | null;
}

export const getStoreClaimDetail = cache(async (claimId: string): Promise<StoreClaimDetail | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("store_claims")
    .select(
      `id, status, store_name, municipality, uf, address, whatsapp, opening_hours,
       offers_delivery, offers_pickup, services, notes, rejection_reason,
       created_at, reviewed_at,
       requester:profiles!store_claims_requester_id_fkey (id, full_name),
       reviewer:profiles!store_claims_reviewed_by_fkey (full_name),
       stores (id, name, slug, municipality, uf, is_active)`
    )
    .eq("id", claimId)
    .maybeSingle();

  if (error) throw new Error(`getStoreClaimDetail failed: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    status: data.status,
    storeName: data.store_name,
    municipality: data.municipality,
    uf: data.uf,
    address: data.address,
    whatsapp: data.whatsapp,
    openingHours: data.opening_hours,
    offersDelivery: data.offers_delivery,
    offersPickup: data.offers_pickup,
    services: data.services ?? [],
    notes: data.notes,
    rejectionReason: data.rejection_reason,
    createdAt: data.created_at,
    reviewedAt: data.reviewed_at,
    requestedBy: { id: data.requester.id, fullName: data.requester.full_name },
    reviewedBy: data.reviewer ? { fullName: data.reviewer.full_name } : null,
    linkedStore: data.stores
      ? {
          id: data.stores.id,
          name: data.stores.name,
          slug: data.stores.slug,
          municipality: data.stores.municipality,
          uf: data.stores.uf,
          isActive: data.stores.is_active,
        }
      : null,
  };
});
