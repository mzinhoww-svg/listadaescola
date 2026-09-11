"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { nullableArg } from "@/lib/admin/rpc-utils";

export interface FormState {
  error?: string;
  success?: string;
}

const MAX_TEXT_LENGTH = 1000;

function trimmedOrUndefined(value: FormDataEntryValue | null): string | undefined {
  const str = String(value ?? "").trim();
  return str === "" ? undefined : str;
}

export async function updateSchoolAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const gate = await requireAdmin(supabase);
  if ("error" in gate) return { error: "Você não tem permissão para editar escolas." };

  const schoolId = String(formData.get("school_id") ?? "");
  const description = trimmedOrUndefined(formData.get("description"));
  const website = trimmedOrUndefined(formData.get("website"));

  if (description && description.length > MAX_TEXT_LENGTH) return { error: "Descrição muito longa." };
  if (website && website.length > 300) return { error: "Website muito longo." };

  const { error } = await supabase.rpc("admin_update_school", {
    p_school_id: schoolId,
    p_is_active: formData.get("is_active") === "on",
    p_description: nullableArg(description ?? null),
    p_logo_url: nullableArg(trimmedOrUndefined(formData.get("logo_url")) ?? null),
    p_website: nullableArg(website ?? null),
    p_instagram: nullableArg(trimmedOrUndefined(formData.get("instagram")) ?? null),
    p_whatsapp: nullableArg(trimmedOrUndefined(formData.get("whatsapp")) ?? null),
    p_is_verified: formData.get("is_verified") === "on",
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/escolas");
  revalidatePath(`/admin/escolas/${schoolId}`);
  return { success: "Escola atualizada." };
}
