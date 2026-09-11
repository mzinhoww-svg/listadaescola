"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export interface FormState {
  error?: string;
  success?: string;
}

const MAX_TEXT_LENGTH = 200;
const MAX_NOTES_LENGTH = 500;
const SCHOOL_TYPES: readonly Database["public"]["Enums"]["school_type"][] = ["PUBLIC", "PRIVATE"];

/**
 * PRD RF-008: never creates an `schools` row directly -- an admin reviews
 * and creates the real record manually. `school_suggestions` has no owner
 * UPDATE/DELETE RLS policy (schema is deliberate: single-shot, immutable
 * once sent), so there's no draft/edit flow to build here, unlike lists.
 */
export async function submitSchoolSuggestionAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente para continuar." };

  const name = String(formData.get("name") ?? "").trim();
  const municipality = String(formData.get("municipality") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const schoolTypeRaw = String(formData.get("school_type") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || name.length > MAX_TEXT_LENGTH) return { error: "Informe o nome da escola." };
  if (!municipality || municipality.length > MAX_TEXT_LENGTH) return { error: "Informe o município." };
  if (address.length > MAX_TEXT_LENGTH) return { error: "Endereço muito longo." };
  if (notes.length > MAX_NOTES_LENGTH) return { error: "Observação muito longa." };

  const schoolType = SCHOOL_TYPES.includes(schoolTypeRaw as Database["public"]["Enums"]["school_type"])
    ? (schoolTypeRaw as Database["public"]["Enums"]["school_type"])
    : null;

  const { error } = await supabase.from("school_suggestions").insert({
    suggested_by: user.id,
    name,
    uf: "MT",
    municipality,
    address: address || null,
    phone: phone || null,
    school_type: schoolType,
    notes: notes || null,
  });

  if (error) return { error: "Não foi possível enviar a sugestão. Tente novamente." };

  return { success: "Sugestão enviada! Nossa equipe vai avaliar e adicionar a escola em breve." };
}
