"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { nullableArg, translateAdminDbError } from "@/lib/admin/rpc-utils";

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

/** list_id/ecommerce_product_id exist on the underlying RPCs (and stay
 * available for future direct SQL entry / a fuller UI) but aren't
 * collected by either Drawer form below -- cascading store/partner ->
 * list/product pickers are real added UI complexity for a field that
 * isn't essential to "houve venda, valor, comissão", so v1 always passes
 * null for both. Documented scope trim, not an oversight. */
export async function upsertStoreSaleReportAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para gerenciar vendas de papelarias." };

  const id = optionalString(formData, "id");
  const storeId = String(formData.get("store_id") ?? "").trim();
  if (!storeId) return { error: "Selecione a papelaria." };

  const { error } = await supabase.rpc("admin_upsert_store_sale_report", {
    p_id: nullableArg(id),
    p_store_id: storeId,
    p_school_id: nullableArg(optionalString(formData, "school_id")),
    p_list_id: nullableArg<string>(null),
    p_status: String(formData.get("status") ?? "REQUESTED"),
    p_quoted_value: nullableArg(optionalNumber(formData, "quoted_value")),
    p_sale_value: nullableArg(optionalNumber(formData, "sale_value")),
    p_notes: nullableArg(optionalString(formData, "notes")),
  });
  if (error) return { error: translateAdminDbError(error.message) };

  revalidatePath("/admin/vendas");
  return { success: id ? "Registro atualizado." : "Registro criado." };
}

export async function upsertPartnerSaleReportAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para gerenciar vendas de parceiros." };

  const id = optionalString(formData, "id");
  const partnerId = String(formData.get("partner_id") ?? "").trim();
  if (!partnerId) return { error: "Selecione o parceiro." };

  const grossValue = optionalNumber(formData, "gross_value");
  if (grossValue === null || grossValue <= 0) return { error: "Informe um valor bruto válido." };

  const { error } = await supabase.rpc("admin_upsert_partner_sale_report", {
    p_id: nullableArg(id),
    p_partner_id: partnerId,
    p_ecommerce_product_id: nullableArg<string>(null),
    p_school_id: nullableArg(optionalString(formData, "school_id")),
    p_list_id: nullableArg<string>(null),
    p_gross_value: grossValue,
    p_commission_value: optionalNumber(formData, "commission_value") ?? 0,
    p_notes: nullableArg(optionalString(formData, "notes")),
  });
  if (error) return { error: translateAdminDbError(error.message) };

  revalidatePath("/admin/vendas");
  return { success: id ? "Registro atualizado." : "Registro criado." };
}
