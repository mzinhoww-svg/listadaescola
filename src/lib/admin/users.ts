import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export interface AdminUserRow {
  id: string;
  fullName: string | null;
  role: UserRole;
  createdAt: string;
}

// Prompt 18 (performance audit): same MAX_ROWS reasoning as admin/lists.ts
// -- full paginated UI deferred, this closes the unbounded-scan risk now.
const MAX_ROWS = 200;

/**
 * RF-016 "Usuários" screen. No email column on purpose: email lives in
 * `auth.users`, which isn't in the public schema and nothing else in this
 * app exposes another user's email anywhere (moderation queues only ever
 * show full_name) -- adding that would need a new SECURITY DEFINER
 * function reading auth.users, a bigger change than this gap calls for.
 */
export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: false })
    .range(0, MAX_ROWS - 1);

  if (error) throw new Error(`getAdminUsers failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at,
  }));
}
