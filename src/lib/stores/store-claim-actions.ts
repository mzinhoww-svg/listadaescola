"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { normalizeWhatsappNumber } from "@/lib/stores/whatsapp";
import { sanitizeStoreServices } from "@/lib/stores/services";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";

export interface FormState {
  error?: string;
  success?: string;
}

const MAX_NAME = 200;
const MAX_MUNICIPALITY = 120;
const MAX_ADDRESS = 300;
const MAX_OPENING_HOURS = 200;
const MAX_NOTES = 1000;

function optional(formData: FormData, key: string, max: number): string | null {
  const value = String(formData.get(key) ?? "").trim();
  if (value === "") return null;
  return value.slice(0, max);
}

/**
 * Onda 6 -- a porta de entrada do dono de papelaria (PRD §4.4 Store
 * Manager, RF-011/RF-012).
 *
 * NÃO cria nenhuma linha em `stores`: grava a solicitação em
 * `store_claims` e ela fica invisível para o público até um admin
 * aprovar por `approve_store_claim()`. Ver o cabeçalho da migration
 * 20260913030000_store_self_service.sql para por que o autocadastro não
 * escreve direto em `stores`.
 *
 * Reivindicação e cadastro novo são o MESMO fluxo e a MESMA fila: a única
 * diferença é `store_id` preenchido. Quando é reivindicação, o nome e o
 * município vêm da papelaria escolhida (lidos aqui no servidor), nunca do
 * que o usuário digitou -- assim a solicitação não pode "renomear" uma
 * papelaria existente antes mesmo de ser aprovada.
 */
export async function submitStoreClaimAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente para continuar." };

  const storeIdRaw = String(formData.get("store_id") ?? "").trim();
  const isClaim = String(formData.get("claim_kind") ?? "new") === "existing";
  const storeId = isClaim && storeIdRaw !== "" ? storeIdRaw : null;

  // RF-012: telefone validado e normalizado no servidor, sempre. Reusa
  // normalizeWhatsappNumber -- a única implementação da regra no projeto.
  const whatsappRaw = String(formData.get("whatsapp") ?? "").trim();
  const whatsapp = normalizeWhatsappNumber(whatsappRaw);
  if (!whatsapp) {
    return { error: "Informe um WhatsApp válido com DDD, por exemplo (65) 99999-9999." };
  }

  let storeName: string;
  let municipality: string;
  let uf = "MT";

  if (isClaim) {
    if (!storeId) return { error: "Escolha a papelaria que você quer reivindicar." };

    const { data: store } = await supabase
      .from("stores")
      .select("id, name, municipality, uf")
      .eq("id", storeId)
      .eq("is_active", true)
      .maybeSingle();

    if (!store) return { error: "Papelaria não encontrada. Escolha uma da lista." };

    storeName = store.name;
    municipality = store.municipality;
    uf = store.uf;
  } else {
    storeName = String(formData.get("store_name") ?? "").trim();
    municipality = String(formData.get("municipality") ?? "").trim();

    if (storeName.length < 2 || storeName.length > MAX_NAME) {
      return { error: "Informe o nome da papelaria." };
    }
    if (municipality.length < 2 || municipality.length > MAX_MUNICIPALITY) {
      return { error: "Informe o município da papelaria." };
    }
  }

  const services = sanitizeStoreServices(formData.getAll("services").map((value) => String(value)));

  const { error } = await supabase.from("store_claims").insert({
    requester_id: user.id,
    store_id: storeId,
    store_name: storeName,
    uf,
    municipality,
    address: optional(formData, "address", MAX_ADDRESS),
    whatsapp,
    opening_hours: optional(formData, "opening_hours", MAX_OPENING_HOURS),
    offers_delivery: formData.get("offers_delivery") === "on",
    offers_pickup: formData.get("offers_pickup") === "on",
    services,
    notes: optional(formData, "notes", MAX_NOTES),
  });

  if (error) {
    // 23505 = o índice parcial store_claims_one_pending_per_target_idx.
    // Pedir de novo o mesmo enquanto o primeiro está na fila não é erro
    // do usuário, é ansiedade -- responde como estado, não como falha.
    if (error.code === "23505") {
      return { error: "Você já tem uma solicitação em análise para esta papelaria. Aguarde nossa resposta." };
    }
    if (error.message.includes("rate limit exceeded")) {
      return { error: "Muitas solicitações em pouco tempo. Tente novamente daqui a pouco." };
    }
    return { error: "Não foi possível enviar a solicitação. Tente novamente." };
  }

  await recordAnalyticsEvent({
    eventType: "submission_submitted",
    storeId: storeId ?? undefined,
    metadata: { kind: "store_claim", claim: isClaim ? "existing" : "new" },
  });

  revalidatePath("/minha-papelaria");

  return {
    success: isClaim
      ? "Solicitação enviada! Vamos conferir os dados e liberar o acesso à sua papelaria."
      : "Solicitação enviada! Assim que aprovarmos, sua papelaria aparece para as famílias da região.",
  };
}
