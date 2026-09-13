import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type SchoolClaimStatus = Database["public"]["Enums"]["submission_status"];

export interface OwnSchoolClaim {
  id: string;
  schoolId: string;
  schoolName: string;
  status: SchoolClaimStatus;
  rejectionReason: string | null;
  createdAt: string;
}

/**
 * Onda 7. As reivindicações da PRÓPRIA pessoa.
 *
 * `school_claims_select_own` já recorta por `claimed_by = auth.uid()`, e
 * é ela que autoriza -- o `.eq()` explícito aqui não existe porque a RLS
 * seria insuficiente, mas porque uma consulta que depende só de RLS para
 * estar correta é frágil de ler. Não existe (nem pode existir) leitura de
 * reivindicação alheia: seria um oráculo de "esta escola já foi
 * reivindicada, e por quem".
 */
export const getOwnSchoolClaims = cache(async (): Promise<OwnSchoolClaim[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("school_claims")
    .select("id, school_id, status, rejection_reason, created_at, schools (name)")
    .eq("claimed_by", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getOwnSchoolClaims failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    schoolName: row.schools?.name ?? "escola",
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
  }));
});

/** A reivindicação mais recente desta pessoa para ESTA escola, se houver
 * -- é o que decide qual estado o botão "É a sua escola?" mostra no perfil
 * público. */
export async function getOwnClaimForSchool(schoolId: string): Promise<OwnSchoolClaim | null> {
  const claims = await getOwnSchoolClaims();
  return claims.find((claim) => claim.schoolId === schoolId) ?? null;
}
