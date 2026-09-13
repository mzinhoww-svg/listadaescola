import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { PublicListCard } from "@/lib/lists/list-detail";

export type FavoriteTargetType = Database["public"]["Enums"]["favorite_target_type"];

/**
 * Cookie-aware (needs auth.uid()) -- always false for an anonymous
 * visitor, never throws. Used to pass the initial toggle state into
 * <SaveButton> so it renders correctly on first paint without a client
 * round trip.
 */
export async function isFavorited(targetType: FavoriteTargetType, targetId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("favorites")
    .select("id")
    .eq("profile_id", user.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  return Boolean(data);
}

export interface FavoriteSchool {
  id: string;
  name: string;
  slug: string;
  uf: string;
  municipality: string;
}

export interface FavoriteSchoolsResult {
  schools: FavoriteSchool[];
  /** Roadmap Tier 1 / B2: favorited schools that no longer pass the public
   * visibility filter (deactivated) used to just vanish from the result
   * with no trace -- the saved count looked right, the item silently
   * wasn't there. Surfacing the count lets the page say so instead. */
  unavailableCount: number;
}

/**
 * Sorts favorited-most-recently-first (favorites.created_at) rather than
 * the schools/lists table's own default order, since "what did I save"
 * reads naturally newest-first. `target_id` isn't a declared FK (it's
 * polymorphic across target_type), so this is two round trips: favorite
 * ids, then the rows themselves, filtered by the same public-visibility
 * rule as everywhere else so a since-deactivated school never shows up
 * as a dangling link on the user's own saved page.
 */
export async function getFavoriteSchools(): Promise<FavoriteSchoolsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { schools: [], unavailableCount: 0 };

  const { data: favorites, error: favError } = await supabase
    .from("favorites")
    .select("target_id")
    .eq("profile_id", user.id)
    .eq("target_type", "SCHOOL")
    .order("created_at", { ascending: false });
  if (favError) throw new Error(`getFavoriteSchools failed: ${favError.message}`);
  if (!favorites || favorites.length === 0) return { schools: [], unavailableCount: 0 };

  const { data: schools, error: schoolsError } = await supabase
    .from("schools")
    .select("id, name, slug, uf, municipality")
    .in(
      "id",
      favorites.map((favorite) => favorite.target_id)
    )
    .eq("is_active", true);
  if (schoolsError) throw new Error(`getFavoriteSchools (schools) failed: ${schoolsError.message}`);

  const order = new Map(favorites.map((favorite, index) => [favorite.target_id, index]));
  const sorted = [...(schools ?? [])].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return { schools: sorted, unavailableCount: favorites.length - sorted.length };
}

export interface FavoriteListsResult {
  lists: PublicListCard[];
  /** Same reasoning as FavoriteSchoolsResult.unavailableCount, for lists
   * that were unpublished/archived or whose school was deactivated. */
  unavailableCount: number;
}

/** Same reasoning/shape as getFavoriteSchools, for target_type = 'LIST'. */
export async function getFavoriteLists(): Promise<FavoriteListsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { lists: [], unavailableCount: 0 };

  const { data: favorites, error: favError } = await supabase
    .from("favorites")
    .select("target_id")
    .eq("profile_id", user.id)
    .eq("target_type", "LIST")
    .order("created_at", { ascending: false });
  if (favError) throw new Error(`getFavoriteLists failed: ${favError.message}`);
  if (!favorites || favorites.length === 0) return { lists: [], unavailableCount: 0 };

  const { data, error } = await supabase
    .from("school_lists")
    .select(
      `id, slug, education_level, series_name, school_year, updated_at,
       schools!inner (name, slug, uf, municipality, is_active),
       school_list_versions!inner (status)`
    )
    .in(
      "id",
      favorites.map((favorite) => favorite.target_id)
    )
    .eq("status", "APPROVED")
    .eq("schools.is_active", true)
    .eq("school_list_versions.status", "PUBLISHED");
  if (error) throw new Error(`getFavoriteLists (lists) failed: ${error.message}`);

  const seen = new Set<string>();
  const rows = (data ?? []).filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  const order = new Map(favorites.map((favorite, index) => [favorite.target_id, index]));
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return {
    lists: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      educationLevel: row.education_level,
      seriesName: row.series_name,
      schoolYear: row.school_year,
      updatedAt: row.updated_at,
      school: row.schools,
    })),
    unavailableCount: favorites.length - rows.length,
  };
}
