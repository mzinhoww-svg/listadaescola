import type { Database } from "@/lib/supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

/** Roles allowed into /admin. Mirrors is_admin() in
 * supabase/migrations/20260910200900_rls_helper_functions.sql — keep in
 * sync if that function's role list ever changes. */
export const ADMIN_ROLES: readonly UserRole[] = ["ADMIN", "SUPER_ADMIN"];

/** Shared across every screen that displays a role to a human (admin
 * user list, admin shell identity) -- one map, so a role never reads
 * differently in two places. */
export const ROLE_LABEL: Record<UserRole, string> = {
  USER: "Usuário",
  EDITOR: "Editor",
  SCHOOL_MANAGER: "Gestor de escola",
  STORE_MANAGER: "Gestor de papelaria",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
};
