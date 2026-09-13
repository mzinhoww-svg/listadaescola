"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";

export interface FormState {
  error?: string;
  success?: string;
}

const MAX_REASON_LENGTH = 1000;

function revalidateClaimPaths(claimId: string) {
  revalidatePath("/admin/moderacao/reivindicacoes");
  revalidatePath(`/admin/moderacao/reivindicacoes/${claimId}`);
  revalidatePath("/admin/usuarios");
}

/** Traduz as exceções de `approve_school_claim`/`reject_school_claim`
 * (que saem cruas em inglês pelo `error.message` do PostgREST) para a UI
 * em português. Mesma ideia de `translateAdminDbError`, local aqui porque
 * as mensagens são específicas deste fluxo. */
function translateClaimError(message: string): string {
  if (message.includes("you cannot review your own claim")) {
    return "Você não pode decidir a própria reivindicação. Peça a outro administrador.";
  }
  if (message.includes("was already reviewed")) {
    return "Esta solicitação já foi decidida por alguém.";
  }
  if (message.includes("is not active")) {
    return "A escola está inativa. Reative-a antes de aprovar a reivindicação.";
  }
  if (message.includes("rate limit exceeded for admin_set_user_role")) {
    return "Limite de trocas de papel por hora atingido. Tente de novo mais tarde.";
  }
  return message;
}

export async function approveSchoolClaimAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para revisar reivindicações." };

  const claimId = String(formData.get("claim_id") ?? "");
  const { error } = await supabase.rpc("approve_school_claim", { p_claim_id: claimId });
  if (error) return { error: translateClaimError(error.message) };

  revalidateClaimPaths(claimId);
  return { success: "Reivindicação aprovada. A pessoa já pode gerenciar a escola em /minha-escola." };
}

export async function rejectSchoolClaimAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para revisar reivindicações." };

  const claimId = String(formData.get("claim_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  // Obrigatório também no banco (`reject_school_claim` levanta exceção e a
  // constraint school_claims_rejected_needs_reason recusa a linha). Aqui é
  // só para a pessoa ver a mensagem certa antes da ida ao servidor falhar.
  if (!reason) return { error: "Informe o motivo da rejeição — o solicitante lê esse texto." };
  if (reason.length > MAX_REASON_LENGTH) return { error: "Motivo muito longo." };

  const { error } = await supabase.rpc("reject_school_claim", { p_claim_id: claimId, p_reason: reason });
  if (error) return { error: translateClaimError(error.message) };

  revalidateClaimPaths(claimId);
  return { success: "Reivindicação rejeitada." };
}
