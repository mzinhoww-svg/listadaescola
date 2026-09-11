import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type SuggestionStatus = Database["public"]["Enums"]["submission_status"];

export const SUGGESTION_QUEUE_DEFAULT_STATUSES: readonly SuggestionStatus[] = ["SUBMITTED"];
export const SUGGESTION_QUEUE_FILTERABLE_STATUSES: readonly SuggestionStatus[] = ["SUBMITTED", "APPROVED", "REJECTED"];

export interface SuggestionQueueItem {
  id: string;
  status: SuggestionStatus;
  name: string;
  municipality: string;
  uf: string;
  createdAt: string;
  suggestedBy: { fullName: string | null };
}

/** Same "oldest first is the priority" convention as
 * getModerationQueue -- no fabricated priority column here either. */
export async function getSchoolSuggestionQueue(
  statuses: readonly SuggestionStatus[] = SUGGESTION_QUEUE_DEFAULT_STATUSES
): Promise<SuggestionQueueItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_suggestions")
    .select(`id, status, name, municipality, uf, created_at, profiles!school_suggestions_suggested_by_fkey (full_name)`)
    .in("status", statuses)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`getSchoolSuggestionQueue failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    name: row.name,
    municipality: row.municipality,
    uf: row.uf,
    createdAt: row.created_at,
    suggestedBy: { fullName: row.profiles?.full_name ?? null },
  }));
}

export interface SuggestionDetail {
  id: string;
  status: SuggestionStatus;
  name: string;
  municipality: string;
  uf: string;
  address: string | null;
  phone: string | null;
  schoolType: string | null;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  suggestedBy: { id: string; fullName: string | null };
  reviewedBy: { fullName: string | null } | null;
}

export const getSchoolSuggestionDetail = cache(async (suggestionId: string): Promise<SuggestionDetail | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("school_suggestions")
    .select(
      `id, status, name, municipality, uf, address, phone, school_type, notes, rejection_reason,
       created_at, reviewed_at,
       suggested_profile:profiles!school_suggestions_suggested_by_fkey (id, full_name),
       reviewed_profile:profiles!school_suggestions_reviewed_by_fkey (full_name)`
    )
    .eq("id", suggestionId)
    .maybeSingle();

  if (error) throw new Error(`getSchoolSuggestionDetail failed: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    status: data.status,
    name: data.name,
    municipality: data.municipality,
    uf: data.uf,
    address: data.address,
    phone: data.phone,
    schoolType: data.school_type,
    notes: data.notes,
    rejectionReason: data.rejection_reason,
    createdAt: data.created_at,
    reviewedAt: data.reviewed_at,
    suggestedBy: { id: data.suggested_profile.id, fullName: data.suggested_profile.full_name },
    reviewedBy: data.reviewed_profile ? { fullName: data.reviewed_profile.full_name } : null,
  };
});
