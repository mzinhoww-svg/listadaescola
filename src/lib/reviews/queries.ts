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
}

/** `null` for "hasn't reviewed yet" -- distinct from a review that exists
 * but is PENDING/REJECTED, which the form/page needs to render differently
 * (reviews_update_own_pending only allows editing while still PENDING, so
 * REJECTED is a dead end for this school -- unique(school_id, profile_id)
 * blocks a second insert too; documented, not solved here, see gap doc). */
export async function getOwnReview(schoolId: string): Promise<OwnReview | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, status")
    .eq("school_id", schoolId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error) throw new Error(`getOwnReview failed: ${error.message}`);
  return data;
}
