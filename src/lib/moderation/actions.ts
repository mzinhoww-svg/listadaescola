"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { ADMIN_ROLES } from "@/lib/auth/roles";

export interface FormState {
  error?: string;
  success?: string;
}

const MAX_TEXT_LENGTH = 1000;

/**
 * Re-checks admin role in the application layer on top of RLS/the RPC's
 * own internal is_admin() check (SEC-003: never trust the frontend) --
 * turns what would otherwise be a raw Postgres exception into a clean,
 * actionable error for the UI, same pattern as toggleFavoriteAction.
 */
async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" as const };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return { error: "not_admin" as const };
  }
  return { user };
}

function revalidateModerationPaths(submissionId: string) {
  revalidatePath("/admin/moderacao");
  revalidatePath(`/admin/moderacao/${submissionId}`);
}

export async function markUnderReviewAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para revisar submissões." };

  const submissionId = String(formData.get("submission_id") ?? "");
  const { error } = await supabase.rpc("mark_submission_under_review", { p_submission_id: submissionId });
  if (error) return { error: error.message };

  revalidateModerationPaths(submissionId);
  return { success: "Revisão iniciada." };
}

export async function approveSubmissionAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para aprovar submissões." };

  const submissionId = String(formData.get("submission_id") ?? "");
  const { error } = await supabase.rpc("approve_submission", { p_submission_id: submissionId });
  if (error) return { error: error.message };

  revalidateModerationPaths(submissionId);
  return { success: "Lista aprovada e publicada." };
}

export async function rejectSubmissionAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para rejeitar submissões." };

  const submissionId = String(formData.get("submission_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Informe o motivo da rejeição." };
  if (reason.length > MAX_TEXT_LENGTH) return { error: "Motivo muito longo." };

  const { error } = await supabase.rpc("reject_submission", { p_submission_id: submissionId, p_reason: reason });
  if (error) return { error: error.message };

  revalidateModerationPaths(submissionId);
  return { success: "Submissão rejeitada." };
}

export async function requestCorrectionAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para pedir correção." };

  const submissionId = String(formData.get("submission_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!notes) return { error: "Informe o que precisa ser corrigido." };
  if (notes.length > MAX_TEXT_LENGTH) return { error: "Observação muito longa." };

  const { error } = await supabase.rpc("request_submission_correction", {
    p_submission_id: submissionId,
    p_notes: notes,
  });
  if (error) return { error: error.message };

  revalidateModerationPaths(submissionId);
  return { success: "Correção solicitada ao autor." };
}
