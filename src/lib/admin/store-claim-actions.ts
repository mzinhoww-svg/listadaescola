"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";

export interface FormState {
  error?: string;
  success?: string;
}

const MAX_REASON_LENGTH = 1000;

function revalidateStoreClaimPaths(claimId: string) {
  revalidatePath("/admin/moderacao/papelarias");
  revalidatePath(`/admin/moderacao/papelarias/${claimId}`);
  // Aprovar cria/ativa uma papelaria e mexe no papel de um usuário.
  revalidatePath("/admin/papelarias");
  revalidatePath("/admin/usuarios");
}

/** Mensagens de `raise exception` do Postgres chegam cruas em
 * `error.message`. Traduz só as desta fila (mesma ideia de
 * translateAdminDbError, que é para as RPCs de CRUD do admin) e deixa
 * passar o resto -- nunca esconde um erro novo. */
function translate(message: string): string {
  if (message.includes("was already reviewed")) {
    return "Esta solicitação já foi revisada por alguém.";
  }
  if (message.includes("no longer exists")) {
    return "A papelaria reivindicada não existe mais.";
  }
  if (message.includes("rate limit exceeded for admin_set_user_role")) {
    return "Limite de trocas de papel por hora atingido (20). A aprovação não foi feita — tente daqui a pouco.";
  }
  if (message.includes("a rejection reason is required")) {
    return "Informe o motivo da rejeição.";
  }
  return message;
}

export async function approveStoreClaimAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para revisar solicitações de papelaria." };

  const claimId = String(formData.get("claim_id") ?? "");
  const { error } = await supabase.rpc("approve_store_claim", { p_claim_id: claimId });
  if (error) return { error: translate(error.message) };

  await recordAnalyticsEvent({
    eventType: "submission_approved",
    metadata: { kind: "store_claim", claimId },
  });

  revalidateStoreClaimPaths(claimId);
  return { success: "Solicitação aprovada. A papelaria está no ar e o gestor já tem acesso." };
}

export async function rejectStoreClaimAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para revisar solicitações de papelaria." };

  const claimId = String(formData.get("claim_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Informe o motivo da rejeição." };
  if (reason.length > MAX_REASON_LENGTH) return { error: "Motivo muito longo." };

  const { error } = await supabase.rpc("reject_store_claim", { p_claim_id: claimId, p_reason: reason });
  if (error) return { error: translate(error.message) };

  revalidateStoreClaimPaths(claimId);
  return { success: "Solicitação rejeitada." };
}
