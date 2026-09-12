"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";

export interface ReviewFormState {
  error?: string;
  success?: string;
}

const MAX_COMMENT_LENGTH = 1000;

/**
 * The only write path into reviews (RF-014). RLS (reviews_insert_own_pending
 * / reviews_update_own_pending) is the real backstop -- pins profile_id and
 * status server-side regardless of what's re-checked here. unique(school_id,
 * profile_id) means a second submission is always an UPDATE, never a second
 * INSERT; once moderated (APPROVED/REJECTED) the row is no longer editable
 * by its author (RLS), so that path returns a clear message instead of a
 * raw constraint-violation error.
 */
export async function createReviewAction(_prevState: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const schoolId = String(formData.get("school_id") ?? "");
  const path = String(formData.get("path") ?? "/");
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!schoolId) return { error: "Escola inválida." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Escolha uma nota de 1 a 5." };
  }
  if (comment.length > MAX_COMMENT_LENGTH) return { error: "Comentário muito longo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre na sua conta para avaliar." };

  // SEC-008 (hardening pós-MVP): mesmo risco de spam entrando na fila de
  // moderação que a submissão de lista -- unique(school_id, profile_id)
  // já impede repetir a mesma escola, mas não impede avaliar muitas
  // escolas diferentes rapidamente.
  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_action: "review_create",
    p_max_hits: 10,
    p_window_minutes: 60,
  });
  if (allowed === false) {
    return { error: "Muitas avaliações em pouco tempo. Aguarde um pouco e tente novamente." };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("reviews")
    .select("id, status")
    .eq("school_id", schoolId)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (lookupError) return { error: "Não foi possível enviar sua avaliação. Tente novamente." };

  if (existing && existing.status !== "PENDING") {
    return { error: "Você já avaliou esta escola." };
  }

  const payload = {
    school_id: schoolId,
    profile_id: user.id,
    rating,
    comment: comment || null,
    status: "PENDING" as const,
  };

  const { error } = existing
    ? await supabase.from("reviews").update(payload).eq("id", existing.id)
    : await supabase.from("reviews").insert(payload);
  if (error) return { error: "Não foi possível enviar sua avaliação. Tente novamente." };

  if (!existing) {
    void recordAnalyticsEvent({ eventType: "review_created", schoolId });
    await supabase.rpc("record_rate_limit_hit", { p_action: "review_create" });
  }

  revalidatePath(path);
  return { success: "Avaliação enviada para moderação. Obrigado!" };
}
