import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/auth/roles";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return fetchProfile(supabase, user);
}

async function fetchProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string | null }
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return { ...profile, email: user.email ?? null };
}

/**
 * Server-side auth gate for a protected area's layout. `areaPath` is the
 * area's own root (e.g. "/minha-conta") — the middleware already redirects
 * anonymous requests with the exact path+query they asked for; this is a
 * defense-in-depth backstop, not the primary UX path, so a coarser target
 * here is fine.
 */
export async function requireUser(areaPath: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/auth/entrar?next=${encodeURIComponent(areaPath)}`);
  }
  return user;
}

/**
 * Same as requireUser, but also enforces role membership. Role is always
 * re-read from `profiles` here (SEC-003: never trust the frontend, and a
 * Supabase JWT carries no custom role claim by default) — returns null
 * rather than redirecting when the role check fails, so the caller can
 * render an "access denied" state instead of bouncing an already-logged-in
 * user back to the login page.
 */
export async function requireRole(areaPath: string, allowedRoles: readonly UserRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/entrar?next=${encodeURIComponent(areaPath)}`);
  }

  const profile = await fetchProfile(supabase, user);
  if (!profile || !allowedRoles.includes(profile.role)) {
    return null;
  }
  return profile;
}
