import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type SubmissionItem = Database["public"]["Tables"]["submission_items"]["Row"];
type SubmissionAttachment = Database["public"]["Tables"]["submission_attachments"]["Row"];

export interface OwnDraftSubmission {
  id: string;
  status: Database["public"]["Enums"]["submission_status"];
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  correctionNotes: string | null;
  updatedAt: string;
  school: { id: string; name: string; municipality: string };
}

/**
 * Submissions this user can still resume (RF-007 autosave/resume). Scoped
 * by RLS (list_submissions_select_own) regardless, but we filter to
 * editable statuses here too so an already-SUBMITTED/APPROVED row doesn't
 * show up as something to "continue".
 */
export async function getOwnDraftSubmissions(): Promise<OwnDraftSubmission[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("list_submissions")
    .select(
      `id, status, education_level, series_name, school_year, correction_notes, updated_at,
       schools!inner (id, name, municipality)`
    )
    .eq("submitted_by", user.id)
    .in("status", ["DRAFT", "NEEDS_CORRECTION"])
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`getOwnDraftSubmissions failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    educationLevel: row.education_level,
    seriesName: row.series_name,
    schoolYear: row.school_year,
    correctionNotes: row.correction_notes,
    updatedAt: row.updated_at,
    school: row.schools,
  }));
}

export interface OwnSubmission {
  id: string;
  status: Database["public"]["Enums"]["submission_status"];
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  correctionNotes: string | null;
  rejectionReason: string | null;
  updatedAt: string;
  school: { id: string; name: string; slug: string; uf: string; municipality: string };
}

/**
 * Every submission this user owns, optionally narrowed to `statuses` --
 * unlike getOwnDraftSubmissions above (deliberately narrowed to what's
 * still resumable), this backs /minha-conta/listas's full history view
 * (PRD's separate rascunhos/em-analise/publicadas/precisa-correcao/
 * rejeitadas routes, consolidated into one page with status tabs).
 */
export async function getOwnSubmissions(
  statuses?: Database["public"]["Enums"]["submission_status"][]
): Promise<OwnSubmission[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("list_submissions")
    .select(
      `id, status, education_level, series_name, school_year, correction_notes, rejection_reason, updated_at,
       schools!inner (id, name, slug, uf, municipality)`
    )
    .eq("submitted_by", user.id);
  if (statuses && statuses.length > 0) query = query.in("status", statuses);

  const { data, error } = await query.order("updated_at", { ascending: false });
  if (error) throw new Error(`getOwnSubmissions failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    educationLevel: row.education_level,
    seriesName: row.series_name,
    schoolYear: row.school_year,
    correctionNotes: row.correction_notes,
    rejectionReason: row.rejection_reason,
    updatedAt: row.updated_at,
    school: row.schools,
  }));
}

/**
 * The list_submissions -> school_list_versions link (approve_submission()
 * sets versions.submission_id) is the only way to find which published
 * list a given approved submission actually became -- confirmacao/page.tsx
 * needs it to link "Lista aprovada!" to somewhere real instead of leaving
 * the visitor with no way to see what they just contributed. Public data
 * once APPROVED (school_lists_select_approved), so no ownership check
 * needed beyond what the caller already did to reach this submission id.
 */
export async function getPublishedListSlugForSubmission(submissionId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("school_list_versions")
    .select("school_lists(slug)")
    .eq("submission_id", submissionId)
    .maybeSingle();
  return data?.school_lists?.slug ?? null;
}

export interface SubmissionDetail {
  id: string;
  status: Database["public"]["Enums"]["submission_status"];
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  rejectionReason: string | null;
  correctionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  school: { id: string; name: string; slug: string; uf: string; municipality: string };
  items: SubmissionItem[];
  attachments: SubmissionAttachment[];
}

/**
 * Fetches a single submission this user owns, with items/attachments.
 * Returns `null` for "doesn't exist" and "exists but belongs to someone
 * else" alike (RLS already hides the second case, but the explicit
 * `.eq("submitted_by", user.id)` keeps that guarantee readable here
 * rather than depending solely on the policy -- SEC-002 IDOR). Callers
 * must treat `null` as "not found" (redirect/404), never render partial
 * data.
 */
export const getOwnSubmissionDetail = cache(async (submissionId: string): Promise<SubmissionDetail | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("list_submissions")
    .select(
      `id, status, education_level, series_name, school_year, rejection_reason, correction_notes,
       created_at, updated_at,
       schools!inner (id, name, slug, uf, municipality),
       submission_items (*),
       submission_attachments (*)`
    )
    .eq("id", submissionId)
    .eq("submitted_by", user.id)
    .maybeSingle();

  if (error) throw new Error(`getOwnSubmissionDetail failed: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    status: data.status,
    educationLevel: data.education_level,
    seriesName: data.series_name,
    schoolYear: data.school_year,
    rejectionReason: data.rejection_reason,
    correctionNotes: data.correction_notes,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    school: data.schools,
    items: [...data.submission_items].sort((a, b) => a.sort_order - b.sort_order),
    attachments: data.submission_attachments,
  };
});
