import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/supabase/database.types";

export type StoreClaimStatus = Database["public"]["Enums"]["submission_status"];

export interface OwnStoreClaim {
  id: string;
  status: StoreClaimStatus;
  storeName: string;
  municipality: string;
  uf: string;
  storeId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

/**
 * As solicitações do próprio usuário. A RLS (`store_claims_select_own`)
 * é o que garante o recorte -- este filtro não existe na query de
 * propósito: se algum dia a policy mudar, a query não deve ser o que
 * segura o vazamento.
 */
export async function getOwnStoreClaims(): Promise<OwnStoreClaim[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_claims")
    .select("id, status, store_name, municipality, uf, store_id, rejection_reason, created_at, reviewed_at")
    .order("created_at", { ascending: false })
    .range(0, 49);

  if (error) throw new Error(`getOwnStoreClaims failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    storeName: row.store_name,
    municipality: row.municipality,
    uf: row.uf,
    storeId: row.store_id,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  }));
}

export interface ClaimableStore {
  id: string;
  name: string;
  municipality: string;
  uf: string;
}

// Mesmo teto de getActiveStores (store-profile.ts): papelarias são poucas
// e curadas, não importadas em massa como escolas.
const MAX_ROWS = 500;

/**
 * Papelarias que o usuário pode reivindicar no formulário de
 * autocadastro. É a mesma lista que qualquer visitante já vê em
 * `/papelarias` -- não há informação nova aqui, e em particular NÃO se diz
 * quais já têm gestor ou solicitação pendente: isso seria o oráculo que a
 * RLS de `store_claims` existe para impedir. Quem reivindica uma papelaria
 * já reivindicada simplesmente entra na fila, e o admin decide.
 */
export async function getClaimableStores(uf = "MT"): Promise<ClaimableStore[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, municipality, uf")
    .eq("uf", uf)
    .eq("is_active", true)
    .order("municipality", { ascending: true })
    .order("name", { ascending: true })
    .range(0, MAX_ROWS - 1);

  if (error) throw new Error(`getClaimableStores failed: ${error.message}`);
  return data ?? [];
}
