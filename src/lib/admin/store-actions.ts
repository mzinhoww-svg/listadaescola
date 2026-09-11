"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { nullableArg } from "@/lib/admin/rpc-utils";

export interface FormState {
  error?: string;
  success?: string;
}

function optionalString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function optionalNumber(formData: FormData, key: string): number | null {
  const value = String(formData.get(key) ?? "").trim();
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function upsertStoreAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para gerenciar papelarias." };

  const storeId = optionalString(formData, "store_id");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nome é obrigatório." };

  const { error } = await supabase.rpc("admin_upsert_store", {
    p_store_id: nullableArg(storeId),
    p_name: name,
    p_uf: String(formData.get("uf") ?? "").trim(),
    p_municipality: String(formData.get("municipality") ?? "").trim(),
    p_address: nullableArg(optionalString(formData, "address")),
    p_latitude: nullableArg(optionalNumber(formData, "latitude")),
    p_longitude: nullableArg(optionalNumber(formData, "longitude")),
    p_whatsapp: String(formData.get("whatsapp") ?? "").trim(),
    p_opening_hours: nullableArg(optionalString(formData, "opening_hours")),
    p_offers_delivery: formData.get("offers_delivery") === "on",
    p_offers_pickup: formData.get("offers_pickup") === "on",
    p_is_active: formData.get("is_active") === "on",
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/papelarias");
  return { success: storeId ? "Papelaria atualizada." : "Papelaria criada." };
}
