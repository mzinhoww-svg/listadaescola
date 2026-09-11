"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";

export interface FormState {
  error?: string;
  success?: string;
}

const MAX_TEXT_LENGTH = 1000;

function revalidateSuggestionPaths(suggestionId: string) {
  revalidatePath("/admin/moderacao/sugestoes");
  revalidatePath(`/admin/moderacao/sugestoes/${suggestionId}`);
}

export async function approveSchoolSuggestionAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para revisar sugestões." };

  const suggestionId = String(formData.get("suggestion_id") ?? "");
  const { error } = await supabase.rpc("approve_school_suggestion", { p_suggestion_id: suggestionId });
  if (error) return { error: error.message };

  await recordAnalyticsEvent({
    eventType: "submission_approved",
    metadata: { kind: "school_suggestion", suggestionId },
  });

  revalidateSuggestionPaths(suggestionId);
  return { success: "Sugestão aprovada." };
}

export async function rejectSchoolSuggestionAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para revisar sugestões." };

  const suggestionId = String(formData.get("suggestion_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Informe o motivo da rejeição." };
  if (reason.length > MAX_TEXT_LENGTH) return { error: "Motivo muito longo." };

  const { error } = await supabase.rpc("reject_school_suggestion", { p_suggestion_id: suggestionId, p_reason: reason });
  if (error) return { error: error.message };

  revalidateSuggestionPaths(suggestionId);
  return { success: "Sugestão rejeitada." };
}
