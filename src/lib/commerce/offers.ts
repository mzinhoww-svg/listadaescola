import { createPublicClient } from "@/lib/supabase/public";
import type { IntegrationType } from "@/lib/commerce/provider";

export interface ItemOffer {
  ecommerceProductId: string;
  priceHint: number | null;
  partnerId: string;
  partnerName: string;
  partnerLogoUrl: string | null;
  integrationType: IntegrationType;
}

/**
 * One query for every item on the list (RF-010/PRD 13 "evitar N+1"),
 * keyed by school_list_item_id so the lista page can look up each item's
 * offers without a per-item round trip. RLS already restricts this to
 * active partners/products on items belonging to a PUBLISHED version
 * (`list_product_mappings_select_published`); the explicit `is_active`
 * filters here just document that same intent, same pattern as
 * `school-profile.ts`/`list-detail.ts`.
 */
export async function getOffersByListItemId(schoolListItemIds: string[]): Promise<Map<string, ItemOffer[]>> {
  const byItem = new Map<string, ItemOffer[]>();
  if (schoolListItemIds.length === 0) return byItem;

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("list_product_mappings")
    .select(
      `school_list_item_id,
       ecommerce_products!inner (id, price_hint, is_active,
         ecommerce_partners!inner (id, name, logo_url, integration_type, is_active))`
    )
    .in("school_list_item_id", schoolListItemIds)
    .eq("ecommerce_products.is_active", true)
    .eq("ecommerce_products.ecommerce_partners.is_active", true);

  if (error) throw new Error(`getOffersByListItemId failed: ${error.message}`);

  for (const row of data ?? []) {
    const product = row.ecommerce_products;
    const partner = product.ecommerce_partners;
    const offer: ItemOffer = {
      ecommerceProductId: product.id,
      priceHint: product.price_hint,
      partnerId: partner.id,
      partnerName: partner.name,
      partnerLogoUrl: partner.logo_url,
      integrationType: partner.integration_type,
    };
    const existing = byItem.get(row.school_list_item_id);
    if (existing) existing.push(offer);
    else byItem.set(row.school_list_item_id, [offer]);
  }

  return byItem;
}
