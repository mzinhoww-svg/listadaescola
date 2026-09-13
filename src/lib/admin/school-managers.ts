import { createClient } from "@/lib/supabase/server";

export interface SchoolManagerRow {
  id: string;
  profileId: string;
  fullName: string | null;
  createdAt: string;
}

/**
 * Roadmap Tier 0/Tier 4 (SCHOOL_MANAGER): `school_managers` existed in
 * full at the RLS layer (school_managers_admin_all, is_school_manager())
 * since the original schema, but nothing in `src/` ever read or wrote it
 * -- this is the first query against it.
 */
export async function getSchoolManagers(schoolId: string): Promise<SchoolManagerRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_managers")
    .select("id, profile_id, created_at, profiles (full_name)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`getSchoolManagers failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    fullName: row.profiles?.full_name ?? null,
    createdAt: row.created_at,
  }));
}
