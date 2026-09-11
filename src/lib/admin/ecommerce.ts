import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminEcommercePartner = Database["public"]["Tables"]["ecommerce_partners"]["Row"];

export async function getAdminEcommercePartners(): Promise<AdminEcommercePartner[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("ecommerce_partners").select("*").order("name", { ascending: true });
  if (error) throw new Error(`getAdminEcommercePartners failed: ${error.message}`);
  return data ?? [];
}
