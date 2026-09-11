"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";

export interface FormState {
  error?: string;
  success?: string;
}

export async function setListStatusAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para alterar listas." };

  const schoolListId = String(formData.get("school_list_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "APPROVED" && status !== "ARCHIVED") return { error: "Status inválido." };

  const { error } = await supabase.rpc("admin_set_school_list_status", {
    p_school_list_id: schoolListId,
    p_status: status,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/listas");
  revalidatePath(`/admin/listas/${schoolListId}`);
  return { success: status === "ARCHIVED" ? "Lista arquivada." : "Lista reativada." };
}
