import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminStore = Database["public"]["Tables"]["stores"]["Row"];

// Prompt 18 (performance audit): unbounded before -- see lists.ts's MAX_ROWS
// comment for the reasoning (same fix, same follow-up note).
const MAX_ROWS = 200;

/** Flat, single-table entity -- listed in full (no separate detail
 * route/query); the edit Drawer receives a row straight from this list. */
export async function getAdminStores(): Promise<AdminStore[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("name", { ascending: true })
    .range(0, MAX_ROWS - 1);
  if (error) throw new Error(`getAdminStores failed: ${error.message}`);
  return data ?? [];
}
