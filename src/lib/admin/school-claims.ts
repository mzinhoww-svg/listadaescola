import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type SchoolClaimStatus = Database["public"]["Enums"]["submission_status"];

export const CLAIM_QUEUE_DEFAULT_STATUSES: readonly SchoolClaimStatus[] = ["SUBMITTED"];
export const CLAIM_QUEUE_FILTERABLE_STATUSES: readonly SchoolClaimStatus[] = ["SUBMITTED", "APPROVED", "REJECTED"];

// Mesmo teto e mesma razão de admin/lists.ts e school-suggestions.ts
// (auditoria de performance do Prompt 18): fila sem limite é uma consulta
// que cresce sem teto.
const MAX_ROWS = 200;

export interface SchoolClaimQueueItem {
  id: string;
  status: SchoolClaimStatus;
  createdAt: string;
  claimantName: string;
  claimantRole: string;
  school: { id: string; name: string; municipality: string; uf: string };
}

/** Mais antigas primeiro -- mesma convenção de `getModerationQueue`: é a
 * solicitação esperando há mais tempo, não uma prioridade inventada. */
export async function getSchoolClaimQueue(
  statuses: readonly SchoolClaimStatus[] = CLAIM_QUEUE_DEFAULT_STATUSES
): Promise<SchoolClaimQueueItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_claims")
    .select(
      `id, status, created_at, claimant_name, claimant_role,
       schools (id, name, municipality, uf)`
    )
    .in("status", statuses)
    .order("created_at", { ascending: true })
    .range(0, MAX_ROWS - 1);

  if (error) throw new Error(`getSchoolClaimQueue failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    claimantName: row.claimant_name,
    claimantRole: row.claimant_role,
    school: {
      id: row.schools?.id ?? "",
      name: row.schools?.name ?? "—",
      municipality: row.schools?.municipality ?? "",
      uf: row.schools?.uf ?? "",
    },
  }));
}

export interface SchoolClaimDetail {
  id: string;
  status: SchoolClaimStatus;
  claimantName: string;
  claimantRole: string;
  institutionalContact: string;
  justification: string;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  claimedBy: { id: string; fullName: string | null; role: string };
  reviewedBy: { fullName: string | null } | null;
  /** Lado INEP -- o material contra o qual o admin confere a declaração. */
  school: {
    id: string;
    name: string;
    slug: string;
    inepCode: string;
    municipality: string;
    uf: string;
    address: string | null;
    phone: string | null;
    schoolType: string;
    isActive: boolean;
    administrativeDependency: string | null;
    profile: {
      website: string | null;
      instagram: string | null;
      whatsapp: string | null;
      isVerified: boolean;
    } | null;
    contacts: { id: string; contactType: string; value: string; isPublic: boolean }[];
    /** Gestores JÁ vinculados. Um pedido para uma escola que já tem dono é
     * uma decisão diferente de um pedido para escola sem dono. */
    managers: { profileId: string; fullName: string | null }[];
  };
}

/**
 * A tela de decisão. Traz a declaração e os dados INEP na mesma consulta
 * porque o critério de aprovação é literalmente comparar os dois (ver
 * docs/product/school-claim.md) -- não há sinal automático, o admin é o
 * verificador.
 *
 * `school_contacts` entra aqui porque é onde estaria o contato
 * institucional curado. Vale registrar o estado real medido em
 * 2026-09-13: a tabela tem 0 linhas em produção, então hoje o material de
 * conferência que existe de fato é `schools.phone` e `schools.address`,
 * do INEP.
 */
export const getSchoolClaimDetail = cache(async (claimId: string): Promise<SchoolClaimDetail | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("school_claims")
    .select(
      `id, status, claimant_name, claimant_role, institutional_contact, justification,
       rejection_reason, created_at, reviewed_at,
       claimed_profile:profiles!school_claims_claimed_by_fkey (id, full_name, role),
       reviewed_profile:profiles!school_claims_reviewed_by_fkey (full_name),
       schools (
         id, name, slug, inep_code, municipality, uf, address, phone, school_type,
         is_active, administrative_dependency,
         school_profiles (website, instagram, whatsapp, is_verified),
         school_contacts (id, contact_type, value, is_public),
         school_managers (profile_id, profiles (full_name))
       )`
    )
    .eq("id", claimId)
    .maybeSingle();

  if (error) throw new Error(`getSchoolClaimDetail failed: ${error.message}`);
  if (!data || !data.schools) return null;

  const school = data.schools;

  return {
    id: data.id,
    status: data.status,
    claimantName: data.claimant_name,
    claimantRole: data.claimant_role,
    institutionalContact: data.institutional_contact,
    justification: data.justification,
    rejectionReason: data.rejection_reason,
    createdAt: data.created_at,
    reviewedAt: data.reviewed_at,
    claimedBy: {
      id: data.claimed_profile.id,
      fullName: data.claimed_profile.full_name,
      role: data.claimed_profile.role,
    },
    reviewedBy: data.reviewed_profile ? { fullName: data.reviewed_profile.full_name } : null,
    school: {
      id: school.id,
      name: school.name,
      slug: school.slug,
      inepCode: school.inep_code,
      municipality: school.municipality,
      uf: school.uf,
      address: school.address,
      phone: school.phone,
      schoolType: school.school_type,
      isActive: school.is_active,
      administrativeDependency: school.administrative_dependency,
      profile: school.school_profiles
        ? {
            website: school.school_profiles.website,
            instagram: school.school_profiles.instagram,
            whatsapp: school.school_profiles.whatsapp,
            isVerified: school.school_profiles.is_verified,
          }
        : null,
      contacts: (school.school_contacts ?? []).map((contact) => ({
        id: contact.id,
        contactType: contact.contact_type,
        value: contact.value,
        isPublic: contact.is_public,
      })),
      managers: (school.school_managers ?? []).map((manager) => ({
        profileId: manager.profile_id,
        fullName: manager.profiles?.full_name ?? null,
      })),
    },
  };
});

/** Contador para o painel de moderação -- mesma ideia dos outros badges
 * de fila. `head: true` não traz linha nenhuma, só o count. */
export async function countPendingSchoolClaims(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("school_claims")
    .select("id", { count: "exact", head: true })
    .eq("status", "SUBMITTED");

  if (error) throw new Error(`countPendingSchoolClaims failed: ${error.message}`);
  return count ?? 0;
}
