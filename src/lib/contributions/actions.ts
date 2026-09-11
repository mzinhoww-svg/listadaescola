"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { EDITABLE_SUBMISSION_STATUSES, EDUCATION_LEVELS, SCHOOL_YEAR_OPTIONS } from "@/lib/contributions/constants";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";

export interface FormState {
  error?: string;
  success?: string;
}

const MAX_TEXT_LENGTH = 200;
const MAX_NOTES_LENGTH = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_RE.test(value);
}

async function requireOwnEditableSubmission(supabase: Awaited<ReturnType<typeof createClient>>, submissionId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" as const };

  const { data: submission, error } = await supabase
    .from("list_submissions")
    .select("id, submitted_by, status, school_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (error || !submission || submission.submitted_by !== user.id) {
    return { error: "not_found" as const };
  }
  if (!EDITABLE_SUBMISSION_STATUSES.includes(submission.status as (typeof EDITABLE_SUBMISSION_STATUSES)[number])) {
    return { error: "not_editable" as const };
  }
  return { user, submission };
}

export interface SchoolSearchOption {
  id: string;
  name: string;
  municipality: string;
  address: string | null;
  inepCode: string;
}

/** Called directly from the client school-picker (not a form action) --
 * search_schools() is already public-readable data, no ownership involved. */
export async function searchSchoolsForWizardAction(query: string): Promise<SchoolSearchOption[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("search_schools", {
    p_uf: "MT",
    p_name_query: trimmed,
    p_sort: "relevance",
    p_limit: 8,
  });
  if (error) throw new Error(`searchSchoolsForWizardAction failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    municipality: row.municipality,
    address: row.address,
    inepCode: row.inep_code,
  }));
}

export interface StartSubmissionState extends FormState {
  submissionId?: string;
}

/** Step 1 (Escola/Ano/Série): creates the DRAFT row, or reuses one already
 * in progress for the exact same school/ano/série so re-submitting the
 * step form doesn't fork duplicate drafts. */
export async function startSubmissionAction(
  _prevState: StartSubmissionState,
  formData: FormData
): Promise<StartSubmissionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente para continuar." };

  const schoolId = String(formData.get("school_id") ?? "");
  const educationLevel = String(formData.get("education_level") ?? "");
  const seriesName = String(formData.get("series_name") ?? "").trim();
  const schoolYear = Number(formData.get("school_year"));

  if (!isUuid(schoolId)) return { error: "Selecione uma escola na lista de resultados." };
  if (!(EDUCATION_LEVELS as readonly string[]).includes(educationLevel)) {
    return { error: "Selecione uma etapa de ensino válida." };
  }
  if (!seriesName || seriesName.length > MAX_TEXT_LENGTH) {
    return { error: "Informe a série/ano escolar (ex.: 5º Ano)." };
  }
  if (!(SCHOOL_YEAR_OPTIONS as readonly number[]).includes(schoolYear)) {
    return { error: "Selecione um ano letivo válido." };
  }

  const { data: existing } = await supabase
    .from("list_submissions")
    .select("id")
    .eq("submitted_by", user.id)
    .eq("school_id", schoolId)
    .eq("education_level", educationLevel)
    .eq("series_name", seriesName)
    .eq("school_year", schoolYear)
    .in("status", EDITABLE_SUBMISSION_STATUSES)
    .maybeSingle();

  if (existing) {
    redirect(`/enviar-lista/${existing.id}/itens`);
  }

  const { data: created, error } = await supabase
    .from("list_submissions")
    .insert({
      school_id: schoolId,
      submitted_by: user.id,
      education_level: educationLevel,
      series_name: seriesName,
      school_year: schoolYear,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: "Não foi possível iniciar o envio. Tente novamente." };
  }

  // Only the freshly-created-draft path counts as "started" -- the
  // existing-draft-reused branch above redirects before reaching here,
  // since resuming a draft isn't a new start.
  await recordAnalyticsEvent({ eventType: "submission_started", schoolId, metadata: { submissionId: created.id } });

  redirect(`/enviar-lista/${created.id}/itens`);
}

export async function addSubmissionItemAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const submissionId = String(formData.get("submission_id") ?? "");
  const supabase = await createClient();
  const gate = await requireOwnEditableSubmission(supabase, submissionId);
  if ("error" in gate) return { error: "Não foi possível adicionar o item. Recarregue a página." };

  const name = String(formData.get("name") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const unit = String(formData.get("unit") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const isRequired = formData.get("is_required") === "on";
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || name.length > MAX_TEXT_LENGTH) return { error: "Informe o nome do item." };
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
    return { error: "Informe uma quantidade válida." };
  }
  if (notes.length > MAX_NOTES_LENGTH) return { error: "Observação muito longa." };

  const { count } = await supabase
    .from("submission_items")
    .select("id", { count: "exact", head: true })
    .eq("submission_id", submissionId);

  const { error } = await supabase.from("submission_items").insert({
    submission_id: submissionId,
    name,
    quantity,
    unit: unit || null,
    brand: brand || null,
    is_required: isRequired,
    notes: notes || null,
    sort_order: count ?? 0,
  });

  if (error) return { error: "Não foi possível adicionar o item. Tente novamente." };

  revalidatePath(`/enviar-lista/${submissionId}/itens`);
  return { success: "Item adicionado." };
}

export async function deleteSubmissionItemAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const submissionId = String(formData.get("submission_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const supabase = await createClient();
  const gate = await requireOwnEditableSubmission(supabase, submissionId);
  if ("error" in gate) return { error: "Não foi possível remover o item. Recarregue a página." };

  const { error } = await supabase
    .from("submission_items")
    .delete()
    .eq("id", itemId)
    .eq("submission_id", submissionId);

  if (error) return { error: "Não foi possível remover o item." };

  revalidatePath(`/enviar-lista/${submissionId}/itens`);
  return { success: "Item removido." };
}

export async function deleteAttachmentAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const submissionId = String(formData.get("submission_id") ?? "");
  const attachmentId = String(formData.get("attachment_id") ?? "");
  const supabase = await createClient();
  const gate = await requireOwnEditableSubmission(supabase, submissionId);
  if ("error" in gate) return { error: "Não foi possível remover o anexo. Recarregue a página." };

  const { data: attachment } = await supabase
    .from("submission_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (!attachment) return { error: "Anexo não encontrado." };

  await supabase.storage.from("submissions").remove([attachment.storage_path]);

  const { error } = await supabase
    .from("submission_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("submission_id", submissionId);
  if (error) return { error: "Não foi possível remover o anexo." };

  revalidatePath(`/enviar-lista/${submissionId}/anexo`);
  return { success: "Anexo removido." };
}

export async function submitSubmissionAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const submissionId = String(formData.get("submission_id") ?? "");
  const supabase = await createClient();
  const gate = await requireOwnEditableSubmission(supabase, submissionId);
  if ("error" in gate) return { error: "Não foi possível enviar a lista. Recarregue a página." };

  const { count } = await supabase
    .from("submission_items")
    .select("id", { count: "exact", head: true })
    .eq("submission_id", submissionId);
  if (!count) return { error: "Adicione pelo menos um item antes de enviar." };

  const { error } = await supabase
    .from("list_submissions")
    .update({ status: "SUBMITTED" })
    .eq("id", submissionId);
  if (error) return { error: "Não foi possível enviar a lista. Tente novamente." };

  await recordAnalyticsEvent({
    eventType: "submission_submitted",
    schoolId: gate.submission.school_id,
    metadata: { submissionId },
  });

  redirect(`/enviar-lista/${submissionId}/confirmacao`);
}

export async function discardDraftAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const submissionId = String(formData.get("submission_id") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou." };

  // Deliberately scoped to DRAFT only (not NEEDS_CORRECTION) -- matches
  // list_submissions_delete_own_draft RLS exactly; a submission sent back
  // for correction has moderator context worth keeping, not discarding.
  const { error } = await supabase
    .from("list_submissions")
    .delete()
    .eq("id", submissionId)
    .eq("submitted_by", user.id)
    .eq("status", "DRAFT");

  if (error) return { error: "Não foi possível descartar o rascunho." };

  revalidatePath("/enviar-lista");
  return { success: "Rascunho descartado." };
}
