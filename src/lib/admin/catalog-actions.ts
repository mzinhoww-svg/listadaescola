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

export async function upsertProductAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para gerenciar produtos." };

  const productId = optionalString(formData, "product_id");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nome é obrigatório." };

  const { error } = await supabase.rpc("admin_upsert_product", {
    p_product_id: nullableArg(productId),
    p_name: name,
    p_brand: nullableArg(optionalString(formData, "brand")),
    p_category: nullableArg(optionalString(formData, "category")),
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/catalogo");
  return { success: productId ? "Produto atualizado." : "Produto criado." };
}

export async function upsertEcommerceProductAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para gerenciar ofertas de parceiros." };

  const ecommerceProductId = optionalString(formData, "ecommerce_product_id");
  const partnerId = String(formData.get("partner_id") ?? "").trim();
  const productId = String(formData.get("product_id") ?? "").trim();
  const externalUrl = String(formData.get("external_url") ?? "").trim();
  if (!partnerId) return { error: "Selecione um parceiro." };
  if (!productId) return { error: "Selecione um produto." };
  if (!externalUrl) return { error: "URL de destino é obrigatória." };

  const priceHintRaw = String(formData.get("price_hint") ?? "").trim();
  const priceHint = priceHintRaw === "" ? null : Number(priceHintRaw);
  if (priceHint !== null && !Number.isFinite(priceHint)) return { error: "Preço inválido." };

  const { error } = await supabase.rpc("admin_upsert_ecommerce_product", {
    p_ecommerce_product_id: nullableArg(ecommerceProductId),
    p_partner_id: partnerId,
    p_product_id: productId,
    p_external_url: externalUrl,
    p_price_hint: nullableArg(priceHint),
    p_is_active: formData.get("is_active") === "on",
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/catalogo");
  return { success: ecommerceProductId ? "Oferta atualizada." : "Oferta criada." };
}
