"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";
import type { FavoriteTargetType } from "@/lib/favorites/queries";

export interface ToggleFavoriteResult {
  favorited: boolean;
  error?: "not_authenticated" | "unexpected";
}

/**
 * The only write path into favorites from the UI (RF-013). Re-checks auth
 * server-side rather than trusting the caller's `isAuthenticated` prop --
 * RLS (favorites_insert_own/select_own/delete_own, all `profile_id =
 * auth.uid()`) is the real backstop, this just turns a would-be RLS
 * rejection into a clean, actionable result for the client component.
 */
export async function toggleFavoriteAction(
  targetType: FavoriteTargetType,
  targetId: string,
  path: string
): Promise<ToggleFavoriteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { favorited: false, error: "not_authenticated" };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("favorites")
    .select("id")
    .eq("profile_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();
  if (lookupError) return { favorited: false, error: "unexpected" };

  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
    if (error) return { favorited: true, error: "unexpected" };
    revalidatePath(path);
    return { favorited: false };
  }

  const { error } = await supabase
    .from("favorites")
    .insert({ profile_id: user.id, target_type: targetType, target_id: targetId });
  if (error) return { favorited: false, error: "unexpected" };

  void recordAnalyticsEvent({
    eventType: "favorite_added",
    schoolId: targetType === "SCHOOL" ? targetId : undefined,
    listId: targetType === "LIST" ? targetId : undefined,
  });

  revalidatePath(path);
  return { favorited: true };
}
