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

  const { data: approved } = await supabase
    .from("list_submissions")
    .select("school_id")
    .eq("id", submissionId)
    .maybeSingle();
  await recordAnalyticsEvent({
    eventType: "submission_approved",
    schoolId: approved?.school_id,
    metadata: { submissionId },
  });

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
