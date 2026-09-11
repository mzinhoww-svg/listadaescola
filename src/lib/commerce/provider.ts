import type { Database } from "@/lib/supabase/database.types";

export type IntegrationType = Database["public"]["Enums"]["ecommerce_integration_type"];

export interface CommerceCta {
  label: string;
  description: string;
}

const CTA_BY_INTEGRATION: Record<IntegrationType, CommerceCta> = {
  DEEP_LINK: { label: "Ver produto", description: "Abre o produto direto na loja do parceiro" },
  PAGE: { label: "Ver na loja", description: "Abre a página da loja do parceiro" },
  CART: { label: "Adicionar ao carrinho", description: "Abre o carrinho da loja do parceiro com este item" },
};

export interface TrackedOfferLinkParams {
  ecommerceProductId: string;
  schoolListItemId: string;
  schoolId: string;
  listId: string;
}

/**
 * Single source of truth for how a partner's integration_type presents
 * itself (label/description) and for the shape of the tracked outbound
 * link. All three integration types end the exact same way -- an outbound
 * redirect to the partner's own site plus a `commerce_click` record --
 * "carrinho" here only changes which URL on the partner's own domain the
 * link points to (their cart/add-to-cart page), never a cart Listada
 * hosts itself.
 *
 * This never builds the outbound URL itself: `buildTrackedHref` only
 * points at `/api/commerce/click`, which re-resolves the real
 * destination server-side from `ecommerce_products.external_url` (the
 * trusted, admin-only-writable column) -- never from anything carried in
 * the link. That's what keeps this open-redirect-safe (SEC-009).
 */
export const CommerceProvider = {
  ctaFor(integrationType: IntegrationType): CommerceCta {
    return CTA_BY_INTEGRATION[integrationType];
  },
  buildTrackedHref({ ecommerceProductId, schoolListItemId, schoolId, listId }: TrackedOfferLinkParams): string {
    const params = new URLSearchParams({
      product: ecommerceProductId,
      item: schoolListItemId,
      school: schoolId,
      list: listId,
    });
    return `/api/commerce/click?${params.toString()}`;
  },
};
