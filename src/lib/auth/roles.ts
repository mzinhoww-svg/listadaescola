import type { Database } from "@/lib/supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

/** Roles allowed into /admin. Mirrors is_admin() in
 * supabase/migrations/20260910200900_rls_helper_functions.sql — keep in
 * sync if that function's role list ever changes. */
export const ADMIN_ROLES: readonly UserRole[] = ["ADMIN", "SUPER_ADMIN"];
