import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminStore = Database["public"]["Tables"]["stores"]["Row"];

/** Flat, single-table entity -- listed in full (no separate detail
 * route/query); the edit Drawer receives a row straight from this list. */
export async function getAdminStores(): Promise<AdminStore[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("stores").select("*").order("name", { ascending: true });
  if (error) throw new Error(`getAdminStores failed: ${error.message}`);
  return data ?? [];
}
