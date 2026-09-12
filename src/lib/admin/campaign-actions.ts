"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { translateAdminDbError } from "@/lib/admin/rpc-utils";

export interface FormState {
  error?: string;
  success?: string;
}

export async function createCampaignAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para criar campanhas." };

  const entityType = String(formData.get("entity_type") ?? "");
  const entityName = String(formData.get("entity_name") ?? "").trim();
  const startsAtRaw = String(formData.get("starts_at") ?? "");
  const endsAtRaw = String(formData.get("ends_at") ?? "");
  const priority = Number(formData.get("priority") ?? 0);

  if (!entityName) return { error: "Informe o nome exato da escola ou papelaria." };
  const startsAt = new Date(startsAtRaw);
  const endsAt = new Date(endsAtRaw);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "Datas inválidas." };
  }
  if (Number.isNaN(priority) || priority < 0) return { error: "Prioridade inválida." };

  const { error } = await supabase.rpc("admin_create_campaign", {
    p_entity_type: entityType,
    p_entity_name: entityName,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt.toISOString(),
    p_priority: priority,
  });
  if (error) return { error: translateAdminDbError(error.message) };

  revalidatePath("/admin/patrocinios");
  return { success: "Campanha criada." };
}

export async function setCampaignStatusAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para alterar campanhas." };

  const campaignId = String(formData.get("campaign_id") ?? "");
  const status = String(formData.get("status") ?? "");

  const { error } = await supabase.rpc("admin_set_campaign_status", { p_campaign_id: campaignId, p_status: status });
  if (error) return { error: error.message };

  revalidatePath("/admin/patrocinios");
  return { success: "Status da campanha atualizado." };
}
