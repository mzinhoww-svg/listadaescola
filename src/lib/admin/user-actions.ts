"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";

export interface FormState {
  error?: string;
  success?: string;
}

export async function setUserRoleAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para alterar papéis." };

  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");

  const { error } = await supabase.rpc("admin_set_user_role", { p_user_id: userId, p_role: role });
  if (error) return { error: error.message };

  revalidatePath("/admin/usuarios");
  return { success: "Papel atualizado." };
}
