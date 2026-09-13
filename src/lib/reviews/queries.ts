import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/supabase/database.types";

export interface ApprovedReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

/**
 * No reviewer name/avatar here on purpose -- `profiles` has no public-read
 * RLS policy at all (only profiles_select_own/admin), so an anon reader
 * could never resolve one anyway. Showing rating + comment without
 * attribution respects that existing boundary rather than routing around
 * it with a new policy/RPC just for this.
 */
export async function getApprovedReviews(schoolId: string): Promise<ApprovedReview[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at")
    .eq("school_id", schoolId)
    .eq("status", "APPROVED")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getApprovedReviews failed: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  }));
}

export interface OwnReview {
  id: string;
  rating: number;
  comment: string | null;
  status: Database["public"]["Enums"]["review_status"];
  rejectionReason: string | null;
}

/** `null` for "hasn't reviewed yet" -- distinct from a review that exists
 * but is PENDING/REJECTED, which the form/page render differently. REJECTED
 * can always resubmit (reviews_update_own_pending_or_rejected resets the
 * row to PENDING); only APPROVED is final for the author. */
export async function getOwnReview(schoolId: string): Promise<OwnReview | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, status, rejection_reason")
    .eq("school_id", schoolId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) throw new Error(`getOwnReview failed: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    rating: data.rating,
    comment: data.comment,
    status: data.status,
    rejectionReason: data.rejection_reason,
  };
}

export interface OwnReviewListItem extends OwnReview {
  updatedAt: string;
  school: { id: string; name: string; slug: string; uf: string; municipality: string };
}

/**
 * Roadmap C1 (docs/product/roadmap-icps-2026-09.md): "Minhas avaliações"
 * central page -- every review this user has ever left, across schools.
 * `getOwnReview` above stays scoped to one school (the review-form use
 * case); this is the account-wide list.
 */
export async function getOwnReviews(): Promise<OwnReviewListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("reviews")
    .select(
      `id, rating, comment, status, rejection_reason, updated_at,
       schools!inner (id, name, slug, uf, municipality)`
    )
    .eq("profile_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`getOwnReviews failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    rejectionReason: row.rejection_reason,
    updatedAt: row.updated_at,
    school: row.schools,
  }));
}
