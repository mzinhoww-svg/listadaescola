import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type AdminProduct = Database["public"]["Tables"]["products"]["Row"];

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*").order("name", { ascending: true });
  if (error) throw new Error(`getAdminProducts failed: ${error.message}`);
  return data ?? [];
}

export interface AdminEcommerceProduct {
  id: string;
  partnerId: string;
  productId: string;
  externalUrl: string;
  priceHint: number | null;
  isActive: boolean;
  partner: { name: string };
  product: { name: string };
}

/** "Mapeamentos de parceiros" (PRD section 16, Catálogo) -- the row
 * list_product_mappings/PartnerOfferButton point at (Prompt 08). */
export async function getAdminEcommerceProducts(): Promise<AdminEcommerceProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ecommerce_products")
    .select(
      `id, partner_id, product_id, external_url, price_hint, is_active,
       ecommerce_partners!inner (name), products!inner (name)`
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getAdminEcommerceProducts failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    partnerId: row.partner_id,
    productId: row.product_id,
    externalUrl: row.external_url,
    priceHint: row.price_hint,
    isActive: row.is_active,
    partner: row.ecommerce_partners,
    product: row.products,
  }));
}
