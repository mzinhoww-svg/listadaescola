"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { translateAdminDbError } from "@/lib/admin/rpc-utils";
import { parseListItems } from "@/lib/admin/parse-list-items";
import { EDUCATION_LEVELS } from "@/lib/schools/search-schools";
import type { Json } from "@/lib/supabase/database.types";

export interface FormState {
  error?: string;
  success?: string;
}

const MAX_ITEMS = 200;

/**
 * Onda 4. Caminho direto do admin para publicar uma lista.
 *
 * Não passa por `list_submissions` nem pela fila de moderação de propósito:
 * moderação existe para conteúdo de terceiro, e aqui o admin é a fonte. O
 * guard de auto-aprovação de `approve_submission()` tornava impossível
 * publicar sozinho -- ver o comentário da migration `admin_publish_list`.
 */
export async function publishListAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para publicar listas." };

  const schoolId = String(formData.get("school_id") ?? "").trim();
  const educationLevel = String(formData.get("education_level") ?? "").trim();
  const seriesName = String(formData.get("series_name") ?? "").trim();
  const schoolYear = Number(formData.get("school_year") ?? Number.NaN);
  const rawItems = String(formData.get("items_text") ?? "");

  if (!schoolId) return { error: "Escolha a escola." };
  if (!(EDUCATION_LEVELS as readonly string[]).includes(educationLevel)) {
    return { error: "Etapa de ensino inválida." };
  }
  if (!seriesName) return { error: "Informe a série ou o ano." };
  if (!Number.isInteger(schoolYear) || schoolYear < 2000 || schoolYear > 2100) {
    return { error: "Ano letivo inválido." };
  }

  const items = parseListItems(rawItems);
  if (items.length === 0) {
    return { error: "Cole ao menos um item — um por linha." };
  }
  if (items.length > MAX_ITEMS) {
    return { error: `Lista longa demais (${items.length} itens). O limite é ${MAX_ITEMS}.` };
  }

  const { error } = await supabase.rpc("admin_publish_list", {
    p_school_id: schoolId,
    p_education_level: educationLevel,
    p_series_name: seriesName,
    p_school_year: schoolYear,
    // ParsedItem é um shape fechado; o tipo Json do PostgREST exige index
    // signature. O conteúdo é o mesmo -- só a forma do tipo difere.
    p_items: items as unknown as Json,
  });
  if (error) return { error: translateAdminDbError(error.message) };

  revalidatePath("/admin/listas");
  revalidatePath("/listas");
  return {
    success: `Lista publicada com ${items.length} ${items.length === 1 ? "item" : "itens"}.`,
  };
}

export async function setListStatusAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para alterar listas." };

  const schoolListId = String(formData.get("school_list_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "APPROVED" && status !== "ARCHIVED") return { error: "Status inválido." };

  const { error } = await supabase.rpc("admin_set_school_list_status", {
    p_school_list_id: schoolListId,
    p_status: status,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/listas");
  revalidatePath(`/admin/listas/${schoolListId}`);
  return { success: status === "ARCHIVED" ? "Lista arquivada." : "Lista reativada." };
}

export interface SchoolOption {
  id: string;
  name: string;
  municipality: string;
  uf: string;
}

/**
 * Busca de escola para o formulário de publicação. Com 2.722 escolas, um
 * `<select>` é impraticável e digitar o nome exato (como faz o formulário de
 * campanhas) erra por acento e abreviação do INEP. Aqui o admin digita um
 * pedaço e escolhe da lista.
 */
export async function searchSchoolsForAdminAction(term: string): Promise<SchoolOption[]> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return [];

  const query = term.trim();
  if (query.length < 3) return [];

  const { data, error } = await supabase
    .from("schools")
    .select("id, name, municipality, uf")
    .eq("is_active", true)
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(20);

  if (error) return [];
  return data ?? [];
}
