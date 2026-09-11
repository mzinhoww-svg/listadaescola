import { createClient } from "@/lib/supabase/server";
import { ADMIN_ROLES } from "@/lib/auth/roles";

export type AdminGateResult =
  | { error: "not_authenticated" | "not_admin" }
  | { user: { id: string } };

/**
 * Re-checks admin role in the application layer on top of RLS/each RPC's
 * own internal is_admin() check (SEC-003: never trust the frontend) --
 * turns what would otherwise be a raw Postgres exception into a clean,
 * actionable error for the UI. Shared across every admin/* Server Action
 * module (moderation/actions.ts had its own private copy of this exact
 * function -- extracted here once a second, third, etc. module needed
 * the same closure, rather than re-duplicating it per module).
 */
export async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>): Promise<AdminGateResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return { error: "not_admin" };
  }
  return { user: { id: user.id } };
}
