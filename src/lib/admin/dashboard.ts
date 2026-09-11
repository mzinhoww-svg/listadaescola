import { createClient } from "@/lib/supabase/server";

export interface DashboardStats {
  activeSchools: number;
  publishedLists: number;
  pendingSubmissions: number;
  pendingSuggestions: number;
  activeStores: number;
  activePartners: number;
}

/**
 * Real counts only -- no visitas/buscas/cliques/conversão here (those
 * need analytics_events aggregation, explicitly "Prompt 14
 * (analytics-vendas)" per the PRD's own admin dashboard spec). Showing a
 * fabricated number would violate the same "nunca fabricar" principle
 * already applied to distance/rating elsewhere in this codebase -- an
 * honest, smaller dashboard beats a fuller, fake one.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [activeSchools, publishedLists, pendingSubmissions, pendingSuggestions, activeStores, activePartners] =
    await Promise.all([
      supabase.from("schools").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("school_lists").select("id", { count: "exact", head: true }).eq("status", "APPROVED"),
      supabase.from("list_submissions").select("id", { count: "exact", head: true }).in("status", ["SUBMITTED", "UNDER_REVIEW"]),
      supabase.from("school_suggestions").select("id", { count: "exact", head: true }).eq("status", "SUBMITTED"),
      supabase.from("stores").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("ecommerce_partners").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);

  for (const result of [activeSchools, publishedLists, pendingSubmissions, pendingSuggestions, activeStores, activePartners]) {
    if (result.error) throw new Error(`getDashboardStats failed: ${result.error.message}`);
  }

  return {
    activeSchools: activeSchools.count ?? 0,
    publishedLists: publishedLists.count ?? 0,
    pendingSubmissions: pendingSubmissions.count ?? 0,
    pendingSuggestions: pendingSuggestions.count ?? 0,
    activeStores: activeStores.count ?? 0,
    activePartners: activePartners.count ?? 0,
  };
}
