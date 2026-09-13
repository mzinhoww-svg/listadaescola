"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";

export interface FormState {
  error?: string;
  success?: string;
}

/**
 * Roadmap Tier 0/Tier 4 (SCHOOL_MANAGER): `school_managers` is the only
 * gate `is_school_manager()` actually checks (school_managers_admin_all
 * already lets admin insert/delete directly -- no RPC needed, same as
 * `admin_all` policies elsewhere in this batch that skip a wrapper
 * function when the row-level policy alone is already sufficient).
 */
export async function assignSchoolManagerAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para gerenciar gestores de escola." };

  const schoolId = String(formData.get("school_id") ?? "").trim();
  const profileId = String(formData.get("profile_id") ?? "").trim();
  if (!schoolId || !profileId) return { error: "Selecione uma pessoa para tornar gestora." };

  const { error } = await supabase.from("school_managers").insert({ school_id: schoolId, profile_id: profileId });
  if (error) {
    if (error.code === "23505") return { error: "Esta pessoa já é gestora desta escola." };
    return { error: "Não foi possível atribuir o gestor. Tente novamente." };
  }

  // Só rotula quem ainda é USER puro -- nunca reduz alguém que já tem um
  // papel mais forte (ex.: ADMIN) só porque também passou a gerenciar uma
  // escola. Melhor esforço: se falhar, a atribuição em si já valeu (RLS
  // depende só de school_managers, não deste rótulo).
  await supabase.from("profiles").update({ role: "SCHOOL_MANAGER" }).eq("id", profileId).eq("role", "USER");

  revalidatePath(`/admin/escolas/${schoolId}`);
  revalidatePath("/admin/usuarios");
  return { success: "Gestor atribuído." };
}

export async function removeSchoolManagerAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para gerenciar gestores de escola." };

  const id = String(formData.get("id") ?? "");
  const schoolId = String(formData.get("school_id") ?? "");

  const { error } = await supabase.from("school_managers").delete().eq("id", id);
  if (error) return { error: "Não foi possível remover o gestor. Tente novamente." };

  revalidatePath(`/admin/escolas/${schoolId}`);
  return { success: "Gestor removido." };
}
