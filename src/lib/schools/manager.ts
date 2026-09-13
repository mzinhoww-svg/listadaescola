import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * Onda 7 -- leituras da área do gestor (`/minha-escola`).
 *
 * Todas partem de `school_managers` filtrado por `profile_id = auth.uid()`
 * EXPLICITAMENTE, e isso não é redundância: `school_managers_admin_all`
 * deixa um admin ler a tabela inteira, então uma consulta sem o filtro
 * faria a área do gestor de um admin "gerenciar" as 2.722 escolas. O
 * recorte por dono é da consulta; a RLS é o backstop.
 */

export interface ManagedSchool {
  id: string;
  name: string;
  slug: string;
  uf: string;
  municipality: string;
  inepCode: string;
  /** INEP, somente leitura na área do gestor (RN-005). */
  address: string | null;
  phone: string | null;
  isActive: boolean;
  profile: {
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    instagram: string | null;
    whatsapp: string | null;
    isVerified: boolean;
  };
}

/**
 * A escola que a pessoa logada gerencia, ou null.
 *
 * O schema permite N escolas por gestor (`unique (school_id,
 * profile_id)`), mas o produto ainda não tem tela de troca de escola --
 * então a área usa a primeira e isso fica registrado aqui em vez de
 * escondido: se surgir gestor de rede, esta função vira a lista e a área
 * ganha um seletor. Ordena por `created_at` para a escolha ser estável
 * entre requests, não arbitrária.
 */
export const getManagedSchool = cache(async (): Promise<ManagedSchool | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("school_managers")
    .select(
      `school_id, created_at,
       schools (
         id, name, slug, uf, municipality, inep_code, address, phone, is_active,
         school_profiles (description, logo_url, website, instagram, whatsapp, is_verified)
       )`
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`getManagedSchool failed: ${error.message}`);
  const school = data?.schools;
  if (!school) return null;

  return {
    id: school.id,
    name: school.name,
    slug: school.slug,
    uf: school.uf,
    municipality: school.municipality,
    inepCode: school.inep_code,
    address: school.address,
    phone: school.phone,
    isActive: school.is_active,
    profile: {
      description: school.school_profiles?.description ?? null,
      logoUrl: school.school_profiles?.logo_url ?? null,
      website: school.school_profiles?.website ?? null,
      instagram: school.school_profiles?.instagram ?? null,
      whatsapp: school.school_profiles?.whatsapp ?? null,
      isVerified: school.school_profiles?.is_verified ?? false,
    },
  };
});

export interface ManagedSchoolContact {
  id: string;
  contactType: string;
  value: string;
  isPublic: boolean;
}

/** Inclui contatos não públicos -- `school_contacts_manager_select`
 * (Onda 7) existe exatamente para isso: antes dela o gestor não
 * conseguia reler o que ele mesmo tinha cadastrado como interno. */
export async function getManagedSchoolContacts(schoolId: string): Promise<ManagedSchoolContact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_contacts")
    .select("id, contact_type, value, is_public")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`getManagedSchoolContacts failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    contactType: row.contact_type,
    value: row.value,
    isPublic: row.is_public,
  }));
}

export interface ManagedSchoolImage {
  id: string;
  storagePath: string;
  caption: string | null;
  isApproved: boolean;
}

export async function getManagedSchoolImages(schoolId: string): Promise<ManagedSchoolImage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_images")
    .select("id, storage_path, caption, is_approved")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`getManagedSchoolImages failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    storagePath: row.storage_path,
    caption: row.caption,
    isApproved: row.is_approved,
  }));
}

export interface ManagedSchoolList {
  id: string;
  slug: string;
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  status: string;
  versionCount: number;
  lastPublishedAt: string | null;
}

/**
 * Inclui listas ARQUIVADAS -- é para isso que
 * `school_lists_manager_select` existe. Uma lista que o admin arquivou
 * some das páginas públicas, mas o gestor precisa vê-la para entender por
 * que ela não aparece mais, em vez de republicá-la achando que nunca
 * existiu.
 */
export async function getManagedSchoolLists(schoolId: string): Promise<ManagedSchoolList[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_lists")
    .select(
      "id, slug, education_level, series_name, school_year, status, school_list_versions (published_at)"
    )
    .eq("school_id", schoolId)
    .order("school_year", { ascending: false })
    .order("series_name", { ascending: true });

  if (error) throw new Error(`getManagedSchoolLists failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const versions = row.school_list_versions ?? [];
    const lastPublishedAt = versions.reduce<string | null>(
      (latest, version) => (latest === null || version.published_at > latest ? version.published_at : latest),
      null
    );
    return {
      id: row.id,
      slug: row.slug,
      educationLevel: row.education_level,
      seriesName: row.series_name,
      schoolYear: row.school_year,
      status: row.status,
      versionCount: versions.length,
      lastPublishedAt,
    };
  });
}
