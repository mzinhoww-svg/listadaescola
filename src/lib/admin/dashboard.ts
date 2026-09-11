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
 * Real counts only -- visitas/buscas/cliques/conversão live on their own
 * page (/admin/analytics, getAnalyticsEventCounts) rather than duplicated
 * here, same reasoning campaigns/patrocinios got its own page instead of
 * being crammed into this one: PRD section 17's wireframe list treats
 * "Analytics" as its own screen (#25), separate from "Dashboard" (#1-ish).
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
