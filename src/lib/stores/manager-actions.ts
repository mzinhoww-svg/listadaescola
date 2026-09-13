"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { normalizeWhatsappNumber } from "@/lib/stores/whatsapp";
import { sanitizeStoreServices } from "@/lib/stores/services";

export interface FormState {
  error?: string;
  success?: string;
}

const MAX_NAME = 200;
const MAX_MUNICIPALITY = 120;
const MAX_ADDRESS = 300;
const MAX_OPENING_HOURS = 200;

function optional(formData: FormData, key: string, max: number): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value.slice(0, max);
}

/**
 * Edição do cadastro pelo próprio gestor (Onda 6).
 *
 * A autorização é a RLS: `stores_manager_update` só deixa passar a linha
 * de quem é gestor dela, e o trigger `stores_protect_admin_columns_trg`
 * (mesma migration) devolve `is_active`, `is_sponsored`, `slug` e `uf` ao
 * valor anterior para quem não é admin -- ou seja, mesmo que este arquivo
 * mandasse essas colunas, elas não se moveriam. O `store_id` vem do
 * formulário, e isso é seguro justamente porque não é ele que autoriza
 * nada: um id de outra papelaria simplesmente não casa com nenhuma linha
 * visível/gravável para este usuário.
 *
 * Não existe caminho aqui para "ativar minha papelaria": visibilidade é
 * decisão do admin, nunca do frontend (nem do gestor).
 */
export async function updateManagedStoreAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente para continuar." };

  const storeId = String(formData.get("store_id") ?? "").trim();
  if (!storeId) return { error: "Papelaria não identificada." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > MAX_NAME) return { error: "Informe o nome da papelaria." };

  const municipality = String(formData.get("municipality") ?? "").trim();
  if (municipality.length < 2 || municipality.length > MAX_MUNICIPALITY) {
    return { error: "Informe o município da papelaria." };
  }

  const whatsapp = normalizeWhatsappNumber(String(formData.get("whatsapp") ?? ""));
  if (!whatsapp) {
    return { error: "Informe um WhatsApp válido com DDD, por exemplo (65) 99999-9999." };
  }

  const { data: updated, error } = await supabase
    .from("stores")
    .update({
      name,
      municipality,
      address: optional(formData, "address", MAX_ADDRESS),
      whatsapp,
      opening_hours: optional(formData, "opening_hours", MAX_OPENING_HOURS),
      offers_delivery: formData.get("offers_delivery") === "on",
      offers_pickup: formData.get("offers_pickup") === "on",
    })
    .eq("id", storeId)
    .select("id, slug, uf, municipality")
    .maybeSingle();

  if (error) return { error: "Não foi possível salvar as alterações. Tente novamente." };
  // RLS não devolve erro quando a linha não é visível/gravável -- devolve
  // zero linhas. Tratar isso como sucesso seria mentir para o gestor.
  if (!updated) return { error: "Você não tem permissão para editar esta papelaria." };

  const servicesResult = await replaceStoreServices(supabase, storeId, formData);
  if (servicesResult) return servicesResult;

  revalidatePath("/minha-papelaria");
  revalidatePath(`/papelarias/${updated.uf.toLowerCase()}`);

  return { success: "Cadastro atualizado." };
}

/**
 * `store_services` não tem UPDATE para o gestor (só INSERT e DELETE, desde
 * 20260910201200_rls_stores.sql) e a chave é (store_id, service) -- então
 * "salvar a seleção" é apagar o que saiu e inserir o que entrou, nunca um
 * DELETE-tudo-e-recria: isso descartaria serviços que o admin tenha
 * cadastrado fora do vocabulário público.
 */
async function replaceStoreServices(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storeId: string,
  formData: FormData
): Promise<FormState | null> {
  const selected = sanitizeStoreServices(formData.getAll("services").map((value) => String(value)));

  const { data: current, error: readError } = await supabase
    .from("store_services")
    .select("service")
    .eq("store_id", storeId);
  if (readError) return { error: "Cadastro salvo, mas não foi possível atualizar os serviços." };

  const existing = new Set((current ?? []).map((row) => row.service));
  const toInsert = selected.filter((service) => !existing.has(service));
  // Só remove o que pertence ao vocabulário público: um serviço escrito
  // pelo admin à mão não some porque o gestor salvou o formulário.
  const managedByForm = new Set(sanitizeStoreServices([...existing]));
  const toDelete = [...managedByForm].filter((service) => !selected.includes(service));

  if (toDelete.length > 0) {
    const { error } = await supabase.from("store_services").delete().eq("store_id", storeId).in("service", toDelete);
    if (error) return { error: "Cadastro salvo, mas não foi possível remover os serviços desmarcados." };
  }

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from("store_services")
      .insert(toInsert.map((service) => ({ store_id: storeId, service })));
    if (error) return { error: "Cadastro salvo, mas não foi possível adicionar os serviços marcados." };
  }

  return null;
}
