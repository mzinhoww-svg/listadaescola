import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminEcommercePartner = Database["public"]["Tables"]["ecommerce_partners"]["Row"];

// Prompt 18 (performance audit): unbounded before -- see admin/lists.ts's
// MAX_ROWS comment for the reasoning (same fix, same follow-up note).
const MAX_ROWS = 200;

export async function getAdminEcommercePartners(): Promise<AdminEcommercePartner[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ecommerce_partners")
    .select("*")
    .order("name", { ascending: true })
    .range(0, MAX_ROWS - 1);
  if (error) throw new Error(`getAdminEcommercePartners failed: ${error.message}`);
  return data ?? [];
}
