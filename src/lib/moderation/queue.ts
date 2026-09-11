import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type ModerationStatus = Database["public"]["Enums"]["submission_status"];

/** Statuses shown by default -- the actual queue of work. The other tabs
 * (NEEDS_CORRECTION/APPROVED/REJECTED) are history, not "fila". */
export const QUEUE_DEFAULT_STATUSES: readonly ModerationStatus[] = ["SUBMITTED", "UNDER_REVIEW"];
export const QUEUE_FILTERABLE_STATUSES: readonly ModerationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_CORRECTION",
  "APPROVED",
  "REJECTED",
];

export interface QueueItem {
  id: string;
  status: ModerationStatus;
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  createdAt: string;
  school: { name: string; municipality: string };
  submittedBy: { fullName: string | null };
}

// Prompt 18 (performance audit): unbounded before -- see admin/lists.ts's
// MAX_ROWS comment for the reasoning (same fix, same follow-up note). The
// default (pending-only) view self-limits somewhat since items leave once
// reviewed, but the history tabs (APPROVED/REJECTED) grow forever.
const MAX_ROWS = 200;

/**
 * "Fila por prioridade" (PRD): no stored priority column exists (and none
 * is fabricated) -- oldest-submitted-first IS the priority, exactly like
 * every other queue in the app that lacks a manual priority field. Admin
 * layout already gates this route (requireRole); RLS additionally scopes
 * list_submissions_admin_all to is_admin() regardless.
 */
export async function getModerationQueue(statuses: readonly ModerationStatus[] = QUEUE_DEFAULT_STATUSES): Promise<QueueItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("list_submissions")
    .select(
      `id, status, education_level, series_name, school_year, created_at,
       schools!inner (name, municipality),
       profiles!list_submissions_submitted_by_fkey (full_name)`
    )
    .in("status", statuses)
    .order("created_at", { ascending: true })
    .range(0, MAX_ROWS - 1);

  if (error) throw new Error(`getModerationQueue failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    educationLevel: row.education_level,
    seriesName: row.series_name,
    schoolYear: row.school_year,
    createdAt: row.created_at,
    school: row.schools,
    submittedBy: { fullName: row.profiles?.full_name ?? null },
  }));
}
