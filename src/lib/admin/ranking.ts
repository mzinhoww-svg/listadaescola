import { createClient } from "@/lib/supabase/server";

export interface RankingWeights {
  weightDistance: number;
  weightPopularity: number;
  weightLists: number;
  weightCompleteness: number;
  weightQuality: number;
  updatedAt: string;
}

/** Singleton row -- always exactly one (see ranking_weights_singleton
 * check constraint). Admin-only RLS; this is the one place in the app
 * allowed to read it (search_schools() reads it server-side too, but as
 * SECURITY DEFINER, independent of this query/RLS entirely). */
export async function getRankingWeights(): Promise<RankingWeights> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ranking_weights")
    .select("weight_distance, weight_popularity, weight_lists, weight_completeness, weight_quality, updated_at")
    .eq("id", true)
    .single();

  if (error) throw new Error(`getRankingWeights failed: ${error.message}`);

  return {
    weightDistance: Number(data.weight_distance),
    weightPopularity: Number(data.weight_popularity),
    weightLists: Number(data.weight_lists),
    weightCompleteness: Number(data.weight_completeness),
    weightQuality: Number(data.weight_quality),
    updatedAt: data.updated_at,
  };
}
