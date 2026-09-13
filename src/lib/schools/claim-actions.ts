"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";

export interface FormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
}

export interface ClaimSchoolOption {
  id: string;
  name: string;
  municipality: string;
  uf: string;
}

/**
 * Busca de escola para quem chega em `/reivindicar-escola` sem vir do
 * perfil de uma escola (o caminho a partir de `/para-escolas`). Com 2.722
 * escolas, um `<select>` é impraticável.
 *
 * Não é a mesma função do admin (`searchSchoolsForAdminAction`, que é
 * gated por `requireAdmin`) nem podia ser: aqui o chamador é um usuário
 * comum. E não vaza nada -- `schools_select_active` já publica nome,
 * município e UF de toda escola ativa para `anon`; esta ação só evita que
 * a página baixe 2.722 linhas para filtrar no cliente.
 */
export async function searchSchoolsForClaimAction(term: string): Promise<ClaimSchoolOption[]> {
  const query = term.trim();
  if (query.length < 3) return [];

  const supabase = await createClient();
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

/** Espelham os CHECK constraints de `school_claims`
 * (20260913040000_school_claim_and_publish.sql). Duplicados aqui só para
 * o usuário receber uma mensagem em português em vez de uma violação de
 * constraint crua -- o banco continua sendo quem decide. */
const MIN_JUSTIFICATION = 20;
const MAX_JUSTIFICATION = 1000;
const MAX_SHORT_FIELD = 200;
const MIN_CONTACT = 5;

/**
 * Onda 7 -- RF-008 é sugerir escola que não existe; isto é o oposto: a
 * escola existe (é INEP) e alguém afirma representá-la.
 *
 * Não há verificação automática de vínculo, de propósito
 * (docs/product/school-claim.md): e-mail em domínio da escola não serve
 * para a maioria das escolas públicas de MT, e inventar um sinal seria
 * fabricar verificação. O que este formulário faz é coletar o que um
 * humano precisa para decidir, e nada além disso.
 *
 * A ação NUNCA cria vínculo: `approve_school_claim()` (SECURITY DEFINER,
 * exige is_admin()) é o único caminho para uma linha em `school_managers`.
 */
export async function submitSchoolClaimAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente para continuar." };

  const schoolId = String(formData.get("school_id") ?? "").trim();
  const claimantName = String(formData.get("claimant_name") ?? "").trim();
  const claimantRole = String(formData.get("claimant_role") ?? "").trim();
  const institutionalContact = String(formData.get("institutional_contact") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim();

  if (!schoolId) return { error: "Escola não identificada. Volte ao perfil da escola e tente de novo." };

  const fieldErrors: Record<string, string> = {};
  if (claimantName.length < 2 || claimantName.length > MAX_SHORT_FIELD) {
    fieldErrors.claimant_name = "Informe seu nome completo.";
  }
  if (claimantRole.length < 2 || claimantRole.length > MAX_SHORT_FIELD) {
    fieldErrors.claimant_role = "Informe seu cargo ou vínculo com a escola.";
  }
  if (institutionalContact.length < MIN_CONTACT || institutionalContact.length > MAX_SHORT_FIELD) {
    fieldErrors.institutional_contact = "Informe um telefone ou e-mail da escola.";
  }
  if (justification.length < MIN_JUSTIFICATION) {
    fieldErrors.justification = `Conte um pouco mais — pelo menos ${MIN_JUSTIFICATION} caracteres.`;
  }
  if (justification.length > MAX_JUSTIFICATION) {
    fieldErrors.justification = "Texto muito longo.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const { error } = await supabase.from("school_claims").insert({
    school_id: schoolId,
    claimed_by: user.id,
    claimant_name: claimantName,
    claimant_role: claimantRole,
    institutional_contact: institutionalContact,
    justification,
  });

  if (error) {
    // 23505 = school_claims_one_pending_per_school_idx. É o único conflito
    // possível aqui, e a mensagem certa não é "erro", é "já está na fila".
    if (error.code === "23505") {
      return { error: "Você já tem uma solicitação em análise para esta escola." };
    }
    if (error.message.includes("rate limit exceeded")) {
      return { error: "Muitas solicitações em pouco tempo. Aguarde e tente novamente." };
    }
    return { error: "Não foi possível enviar a solicitação. Tente novamente." };
  }

  // Mesmo evento e mesma convenção de metadata de
  // submitSchoolSuggestionAction -- `record_analytics_event` valida
  // `event_type` contra uma lista fechada no banco, e criar um tipo novo
  // exigiria migration por um dado que o `kind` já distingue.
  await recordAnalyticsEvent({
    eventType: "submission_submitted",
    schoolId,
    metadata: { kind: "school_claim" },
  });

  revalidatePath("/minha-escola");
  return {
    success:
      "Solicitação enviada! Nossa equipe confere os dados com a escola e responde por aqui. Você pode acompanhar em Minha escola.",
  };
}
