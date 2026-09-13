"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { parseListItems } from "@/lib/admin/parse-list-items";
import { EDUCATION_LEVELS } from "@/lib/schools/search-schools";
import { MANAGER_CONTACT_TYPES } from "@/lib/schools/manager-constants";
import type { Json } from "@/lib/supabase/database.types";

export interface FormState {
  error?: string;
  success?: string;
}

const MAX_DESCRIPTION = 1000;
const MAX_URL = 300;
const MAX_SHORT = 200;
const MAX_ITEMS = 200;

/**
 * Guard de aplicação da área do gestor.
 *
 * Igual em espírito a `requireAdmin` (src/lib/admin/guard.ts): a
 * autorização REAL é a RLS (`is_school_manager()`) e o gate interno de
 * cada RPC -- isto só transforma o que seria uma exceção crua do Postgres
 * numa mensagem acionável, e evita disparar a escrita quando já se sabe
 * que ela vai ser recusada.
 *
 * Checa o VÍNCULO em `school_managers`, não o papel `SCHOOL_MANAGER` do
 * perfil: `approve_school_claim()` só promove quem ainda é 'USER', então
 * um ADMIN ou STORE_MANAGER que também dirija uma escola mantém o papel
 * maior e passaria a ser barrado por um guard de papel.
 */
async function requireSchoolManager(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string
): Promise<{ userId: string } | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente." };
  if (!schoolId) return { error: "Escola não identificada." };

  const { data } = await supabase
    .from("school_managers")
    .select("id")
    .eq("school_id", schoolId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!data) return { error: "Você não gerencia esta escola." };
  return { userId: user.id };
}

function trimmedOrNull(value: FormDataEntryValue | null): string | null {
  const str = String(value ?? "").trim();
  return str === "" ? null : str;
}

function revalidateSchoolPaths(slug: string, uf: string, municipalitySlug: string) {
  revalidatePath("/minha-escola");
  revalidatePath("/minha-escola/listas");
  revalidatePath(`/escolas/${uf}/${municipalitySlug}/${slug}`);
}

/**
 * Perfil editorial. A lista de campos é fechada e deliberadamente igual à
 * do admin MENOS `is_active` e `is_verified`: INEP é master data e o selo
 * "Verificada" é decisão da equipe, não da escola. Isso não é confiança no
 * frontend -- `school_profiles_protect_admin_columns` (trigger, Onda 7)
 * restaura os dois campos mesmo que alguém poste direto no PostgREST.
 */
export async function updateManagedSchoolProfileAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const gate = await requireSchoolManager(supabase, schoolId);
  if ("error" in gate) return { error: gate.error };

  const description = trimmedOrNull(formData.get("description"));
  const website = trimmedOrNull(formData.get("website"));
  const instagram = trimmedOrNull(formData.get("instagram"));
  const whatsapp = trimmedOrNull(formData.get("whatsapp"));

  if (description && description.length > MAX_DESCRIPTION) return { error: "Descrição muito longa." };
  if (website && website.length > MAX_URL) return { error: "Endereço do site muito longo." };
  if (instagram && instagram.length > MAX_SHORT) return { error: "Instagram muito longo." };
  if (whatsapp && whatsapp.length > MAX_SHORT) return { error: "WhatsApp muito longo." };

  // `upsert` e não `update`: toda escola importada do INEP recebeu uma
  // linha em school_profiles, mas uma escola criada à mão pelo admin pode
  // não ter -- e `school_profiles_manager_write` (INSERT) existe
  // justamente para esse caso.
  const { error } = await supabase
    .from("school_profiles")
    .upsert(
      { school_id: schoolId, description, website, instagram, whatsapp },
      { onConflict: "school_id" }
    );
  if (error) return { error: "Não foi possível salvar. Tente novamente." };

  const slug = String(formData.get("school_slug") ?? "");
  const uf = String(formData.get("school_uf") ?? "");
  const municipalitySlug = String(formData.get("school_municipality_slug") ?? "");
  revalidateSchoolPaths(slug, uf, municipalitySlug);
  return { success: "Perfil atualizado." };
}

export async function addManagedSchoolContactAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const gate = await requireSchoolManager(supabase, schoolId);
  if ("error" in gate) return { error: gate.error };

  const contactType = String(formData.get("contact_type") ?? "").trim().toUpperCase();
  const value = String(formData.get("value") ?? "").trim();

  if (!(MANAGER_CONTACT_TYPES as readonly string[]).includes(contactType)) {
    return { error: "Tipo de contato inválido." };
  }
  if (!value || value.length > MAX_SHORT) return { error: "Informe o contato." };

  const { error } = await supabase.from("school_contacts").insert({
    school_id: schoolId,
    contact_type: contactType,
    value,
    is_public: formData.get("is_public") === "on",
  });
  if (error) return { error: "Não foi possível adicionar o contato." };

  revalidateSchoolPaths(
    String(formData.get("school_slug") ?? ""),
    String(formData.get("school_uf") ?? ""),
    String(formData.get("school_municipality_slug") ?? "")
  );
  return { success: "Contato adicionado." };
}

export async function removeManagedSchoolContactAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const gate = await requireSchoolManager(supabase, schoolId);
  if ("error" in gate) return { error: gate.error };

  const contactId = String(formData.get("contact_id") ?? "").trim();
  // O `.eq("school_id")` não é decoração: sem ele, um id de contato de
  // outra escola chegaria ao banco e dependeria só da RLS para ser
  // recusado. Com ele, a consulta já não casa nada.
  const { error } = await supabase
    .from("school_contacts")
    .delete()
    .eq("id", contactId)
    .eq("school_id", schoolId);
  if (error) return { error: "Não foi possível remover o contato." };

  revalidateSchoolPaths(
    String(formData.get("school_slug") ?? ""),
    String(formData.get("school_uf") ?? ""),
    String(formData.get("school_municipality_slug") ?? "")
  );
  return { success: "Contato removido." };
}

/** Remove a linha em `school_images` E o arquivo no Storage. A ordem
 * importa: se o Storage falhar depois de a linha sumir, sobra um arquivo
 * órfão (invisível, custa bytes); se a linha ficasse e o arquivo sumisse,
 * a página pública renderizaria uma imagem quebrada. */
export async function removeManagedSchoolImageAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const gate = await requireSchoolManager(supabase, schoolId);
  if ("error" in gate) return { error: gate.error };

  const imageId = String(formData.get("image_id") ?? "").trim();
  const { data: image } = await supabase
    .from("school_images")
    .select("id, storage_path")
    .eq("id", imageId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!image) return { error: "Foto não encontrada." };

  const { error } = await supabase.from("school_images").delete().eq("id", imageId).eq("school_id", schoolId);
  if (error) return { error: "Não foi possível remover a foto." };

  await supabase.storage.from("public-assets").remove([image.storage_path]);

  revalidateSchoolPaths(
    String(formData.get("school_slug") ?? ""),
    String(formData.get("school_uf") ?? ""),
    String(formData.get("school_municipality_slug") ?? "")
  );
  return { success: "Foto removida." };
}

/**
 * Publicação direta da lista pela própria escola -- o destravamento da
 * Onda 7.
 *
 * Não passa por `list_submissions` nem pela fila: moderação existe para
 * conteúdo de terceiro, e aqui o gestor foi verificado por um humano
 * ANTES (aprovação da reivindicação). O que substitui a fila é a
 * auditoria: `school_manager_publish_list` grava
 * SCHOOL_MANAGER_PUBLISH_LIST em `audit_logs`, distinguível de
 * ADMIN_PUBLISH_LIST, e o admin pode arquivar depois.
 *
 * Reusa `parseListItems` do admin (src/lib/admin/parse-list-items.ts) --
 * é o mesmo problema (lista chega como texto colado) e um segundo parser
 * divergiria do primeiro na primeira correção de bug.
 */
export async function publishManagedSchoolListAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const gate = await requireSchoolManager(supabase, schoolId);
  if ("error" in gate) return { error: gate.error };

  const educationLevel = String(formData.get("education_level") ?? "").trim();
  const seriesName = String(formData.get("series_name") ?? "").trim();
  const schoolYear = Number(formData.get("school_year") ?? Number.NaN);
  const rawItems = String(formData.get("items_text") ?? "");

  if (!(EDUCATION_LEVELS as readonly string[]).includes(educationLevel)) {
    return { error: "Etapa de ensino inválida." };
  }
  if (!seriesName) return { error: "Informe a série ou o ano." };
  if (!Number.isInteger(schoolYear) || schoolYear < 2000 || schoolYear > 2100) {
    return { error: "Ano letivo inválido." };
  }

  const items = parseListItems(rawItems);
  if (items.length === 0) return { error: "Cole ao menos um item — um por linha." };
  if (items.length > MAX_ITEMS) {
    return { error: `Lista longa demais (${items.length} itens). O limite é ${MAX_ITEMS}.` };
  }

  const { error } = await supabase.rpc("school_manager_publish_list", {
    p_school_id: schoolId,
    p_education_level: educationLevel,
    p_series_name: seriesName,
    p_school_year: schoolYear,
    // ParsedItem é um shape fechado; o tipo Json do PostgREST exige index
    // signature. O conteúdo é o mesmo -- só a forma do tipo difere.
    p_items: items as unknown as Json,
  });
  if (error) {
    if (error.message.includes("only this school")) return { error: "Você não gerencia esta escola." };
    if (error.message.includes("is not active")) {
      return { error: "Esta escola está inativa no momento. Fale com a nossa equipe." };
    }
    return { error: error.message };
  }

  revalidatePath("/minha-escola/listas");
  revalidatePath("/listas");
  revalidateSchoolPaths(
    String(formData.get("school_slug") ?? ""),
    String(formData.get("school_uf") ?? ""),
    String(formData.get("school_municipality_slug") ?? "")
  );
  return {
    success: `Lista publicada com ${items.length} ${items.length === 1 ? "item" : "itens"}.`,
  };
}
