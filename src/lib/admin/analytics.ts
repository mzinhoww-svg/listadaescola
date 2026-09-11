import { createClient } from "@/lib/supabase/server";

export interface AnalyticsEventCounts {
  sinceDays: number;
  counts: Record<string, number>;
  total: number;
}

export interface TopSchool {
  schoolId: string;
  schoolName: string;
  viewCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** RF-015: analytics is read server-side only, via SECURITY INVOKER RPCs
 * that re-check is_admin() themselves -- never a raw table exposed to the
 * browser. See admin_analytics_event_counts/admin_analytics_top_schools
 * in 20260911180000_analytics_vendas.sql. */
export async function getAnalyticsEventCounts(sinceDays: number): Promise<AnalyticsEventCounts> {
  const supabase = await createClient();
  const since = new Date(Date.now() - sinceDays * DAY_MS).toISOString();
  const { data, error } = await supabase.rpc("admin_analytics_event_counts", { p_since: since });
  if (error) throw new Error(`getAnalyticsEventCounts failed: ${error.message}`);

  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of data ?? []) {
    const value = Number(row.event_count);
    counts[row.event_type] = value;
    total += value;
  }
  return { sinceDays, counts, total };
}

export async function getTopSchools(sinceDays: number, limit = 10): Promise<TopSchool[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - sinceDays * DAY_MS).toISOString();
  const { data, error } = await supabase.rpc("admin_analytics_top_schools", { p_since: since, p_limit: limit });
  if (error) throw new Error(`getTopSchools failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    schoolId: row.school_id,
    schoolName: row.school_name,
    viewCount: Number(row.view_count),
  }));
}

/** Derived rates, recomputed from real counts on every read -- same
 * "never fabricate" principle as distance/rating/ticket médio elsewhere.
 * Both denominators can legitimately be 0 (no data yet in the window);
 * null (not NaN/Infinity) signals "no data" to the UI. */
export function computeApprovalRate(counts: Record<string, number>): number | null {
  const submitted = counts.submission_submitted ?? 0;
  const approved = counts.submission_approved ?? 0;
  return submitted > 0 ? approved / submitted : null;
}

export function computeListOpenRate(counts: Record<string, number>): number | null {
  const schoolViews = counts.school_view ?? 0;
  const listViews = counts.list_view ?? 0;
  return schoolViews > 0 ? listViews / schoolViews : null;
}
