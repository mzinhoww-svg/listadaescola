"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { translateAdminDbError } from "@/lib/admin/rpc-utils";

export interface FormState {
  error?: string;
  success?: string;
}

function parseWeight(formData: FormData, key: string): number {
  return Number(formData.get(key) ?? 0);
}

export async function updateRankingWeightsAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para alterar os pesos do ranking." };

  const weights = {
    p_weight_distance: parseWeight(formData, "weight_distance"),
    p_weight_popularity: parseWeight(formData, "weight_popularity"),
    p_weight_lists: parseWeight(formData, "weight_lists"),
    p_weight_completeness: parseWeight(formData, "weight_completeness"),
    p_weight_quality: parseWeight(formData, "weight_quality"),
  };

  if (Object.values(weights).some((w) => Number.isNaN(w))) {
    return { error: "Todos os pesos precisam ser números válidos." };
  }

  const { error } = await supabase.rpc("admin_update_ranking_weights", weights);
  if (error) return { error: translateAdminDbError(error.message) };

  revalidatePath("/admin/patrocinios");
  return { success: "Pesos do ranking atualizados." };
}
