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

export async function upsertEcommercePartnerAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para gerenciar parceiros." };

  const partnerId = optionalString(formData, "partner_id");
  const name = String(formData.get("name") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  if (!name) return { error: "Nome é obrigatório." };
  if (!website) return { error: "Website é obrigatório." };

  const { error } = await supabase.rpc("admin_upsert_ecommerce_partner", {
    p_partner_id: nullableArg(partnerId),
    p_name: name,
    p_logo_url: nullableArg(optionalString(formData, "logo_url")),
    p_website: website,
    p_integration_type: String(formData.get("integration_type") ?? ""),
    p_is_active: formData.get("is_active") === "on",
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/ecommerce");
  return { success: partnerId ? "Parceiro atualizado." : "Parceiro criado." };
}
