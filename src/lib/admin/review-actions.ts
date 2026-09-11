"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";

export interface FormState {
  error?: string;
  success?: string;
}

function revalidateReviewPaths() {
  revalidatePath("/admin/moderacao/avaliacoes");
}

export async function approveReviewAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para moderar avaliações." };

  const reviewId = String(formData.get("review_id") ?? "");
  const { error } = await supabase.rpc("admin_approve_review", { p_review_id: reviewId });
  if (error) return { error: error.message };

  revalidateReviewPaths();
  return { success: "Avaliação publicada." };
}

export async function rejectReviewAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para moderar avaliações." };

  const reviewId = String(formData.get("review_id") ?? "");
  const { error } = await supabase.rpc("admin_reject_review", { p_review_id: reviewId });
  if (error) return { error: error.message };

  revalidateReviewPaths();
  return { success: "Avaliação recusada." };
}
