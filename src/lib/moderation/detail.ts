import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type SubmissionItem = Database["public"]["Tables"]["submission_items"]["Row"];

export interface ModerationAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  /** Signed, short-lived (10min) -- the bucket is private, so a raw
   * storage_path is useless without one (SEC-006). Regenerated on every
   * page load; never persisted. */
  signedUrl: string | null;
}

export interface SubmissionModerationDetail {
  id: string;
  status: Database["public"]["Enums"]["submission_status"];
  educationLevel: string;
  seriesName: string;
  schoolYear: number;
  rejectionReason: string | null;
  correctionNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  school: { id: string; name: string; slug: string; uf: string; municipality: string };
  submittedBy: { id: string; fullName: string | null };
  reviewedBy: { fullName: string | null } | null;
  items: SubmissionItem[];
  attachments: ModerationAttachment[];
}

/** Admin-only (route already gated; RLS's list_submissions_admin_all is
 * the real backstop regardless). Not scoped by ownership on purpose --
 * that's the whole point of a moderation queue. */
export const getSubmissionModerationDetail = cache(
  async (submissionId: string): Promise<SubmissionModerationDetail | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("list_submissions")
      .select(
        `id, status, education_level, series_name, school_year, rejection_reason, correction_notes,
         created_at, reviewed_at,
         schools!inner (id, name, slug, uf, municipality),
         submitted_profile:profiles!list_submissions_submitted_by_fkey (id, full_name),
         reviewed_profile:profiles!list_submissions_reviewed_by_fkey (full_name),
         submission_items (*),
         submission_attachments (*)`
      )
      .eq("id", submissionId)
      .maybeSingle();

    if (error) throw new Error(`getSubmissionModerationDetail failed: ${error.message}`);
    if (!data) return null;

    // Prompt 18 (performance audit): one createSignedUrl() round trip per
    // attachment -> one batched createSignedUrls() call instead. Matched
    // back by `path`, not array position, since that's what the SDK
    // actually returns to key off of.
    const storagePaths = data.submission_attachments.map((attachment) => attachment.storage_path);
    const { data: signedUrlResults } =
      storagePaths.length > 0
        ? await supabase.storage.from("submissions").createSignedUrls(storagePaths, 600)
        : { data: [] };
    const signedUrlByPath = new Map((signedUrlResults ?? []).map((entry) => [entry.path, entry.signedUrl]));

    const attachments = data.submission_attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
      signedUrl: signedUrlByPath.get(attachment.storage_path) ?? null,
    }));

    return {
      id: data.id,
      status: data.status,
      educationLevel: data.education_level,
      seriesName: data.series_name,
      schoolYear: data.school_year,
      rejectionReason: data.rejection_reason,
      correctionNotes: data.correction_notes,
      createdAt: data.created_at,
      reviewedAt: data.reviewed_at,
      school: data.schools,
      submittedBy: { id: data.submitted_profile.id, fullName: data.submitted_profile.full_name },
      reviewedBy: data.reviewed_profile ? { fullName: data.reviewed_profile.full_name } : null,
      items: [...data.submission_items].sort((a, b) => a.sort_order - b.sort_order),
      attachments,
    };
  }
);
