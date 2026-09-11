import { createClient } from "@/lib/supabase/server";

export interface ReviewQueueItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  school: { id: string; name: string; municipality: string; uf: string };
  author: { fullName: string | null };
}

// Prompt 18 (performance audit): same MAX_ROWS reasoning as admin/lists.ts.
const MAX_ROWS = 200;

/** Pending reviews awaiting moderation (RF-014). Same "oldest first" queue
 * convention as getModerationQueue/getSchoolSuggestionQueue. */
export async function getReviewModerationQueue(): Promise<ReviewQueueItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `id, rating, comment, created_at,
       schools!inner (id, name, municipality, uf),
       profiles!reviews_profile_id_fkey (full_name)`
    )
    .eq("status", "PENDING")
    .order("created_at", { ascending: true })
    .range(0, MAX_ROWS - 1);

  if (error) throw new Error(`getReviewModerationQueue failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    school: row.schools,
    author: { fullName: row.profiles?.full_name ?? null },
  }));
}
