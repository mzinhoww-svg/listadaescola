import type { ItemOffer } from "@/lib/commerce/offers";
import type { IntegrationType } from "@/lib/commerce/provider";

/** Minimal shape of a list item this module needs -- structurally satisfied
 * by `school_list_items` rows (`ListDetail["items"]`) without dragging the
 * whole Row type (and a Supabase import) into a pure module. */
export interface CoverageListItem {
  id: string;
  name: string;
  quantity: number;
}

export interface CoveredItem {
  itemId: string;
  itemName: string;
  quantity: number;
  /** The offer this partner will actually be linked through for the item. */
  offer: ItemOffer;
  /** Same as `offer.priceHint`, hoisted for readability at the call sites. */
  priceHint: number | null;
}

export interface PartnerCoverage {
  partnerId: string;
  partnerName: string;
  partnerLogoUrl: string | null;
  integrationType: IntegrationType;
  /** In the list's own order (sort_order), never re-sorted by price. */
  coveredItems: CoveredItem[];
  coveredCount: number;
  /** Covered items that actually carry a `price_hint`. */
  pricedCount: number;
  /** Covered items with no `price_hint` at all -- the honesty denominator. */
  unpricedCount: number;
  /**
   * Sum of `price_hint` over the covered items that have one, or `null`
   * when not a single covered item has a price. `null` means "show no
   * number at all" -- never R$ 0,00, which would read as free.
   */
  estimatedTotal: number | null;
}

export interface ListCommerceCoverage {
  totalItems: number;
  /** Ordered by PARTNER_COVERAGE_ORDER (see below). */
  partners: PartnerCoverage[];
  /** Items no active partner has any offer for -- these used to just vanish. */
  uncoveredItems: CoverageListItem[];
  /** How many of the list's items at least one partner covers. */
  coveredItemCount: number;
}

/**
 * Aggregates the per-item offer map (`getOffersByListItemId`) into
 * per-partner coverage of the whole list, so the page can answer "qual
 * loja resolve a maior parte da minha lista?" instead of forcing one
 * decision per item.
 *
 * Pure function on purpose: no DB access, no framework. Everything it can
 * say is already implied by the rows RLS let through -- it never widens
 * visibility, it only counts what the caller already fetched.
 *
 * ## Estimativa (RN-009's "nunca fabricar", applied to money)
 *
 * `estimatedTotal` sums `ecommerce_products.price_hint` -- a per-unit
 * *hint* the admin recorded for the partner's product -- over the covered
 * items that have one. It deliberately does NOT multiply by the list's
 * `quantity`: `price_hint` says nothing about the pack size the partner
 * actually sells, so "4 x price_hint" would be a number the data does not
 * support. It is a partial, informative estimate of the partner's own
 * prices, never a total to be paid to Listada (which processes no
 * payment at all) and never a final price. When no covered item has a
 * price, the result is `null` so the UI can stay silent instead of
 * inventing R$ 0,00.
 *
 * ## Um item, várias ofertas do mesmo parceiro
 *
 * `list_product_mappings` can map more than one of a partner's products to
 * the same list item. The cheapest priced offer wins (falling back to the
 * first offer when none is priced) -- the most defensible single number to
 * attribute to that partner for that item.
 */
export function buildListCommerceCoverage(
  items: CoverageListItem[],
  offersByItem: Map<string, ItemOffer[]>
): ListCommerceCoverage {
  const byPartner = new Map<string, PartnerCoverage>();
  const uncoveredItems: CoverageListItem[] = [];
  let coveredItemCount = 0;

  for (const item of items) {
    const offers = offersByItem.get(item.id) ?? [];
    if (offers.length === 0) {
      uncoveredItems.push({ id: item.id, name: item.name, quantity: item.quantity });
      continue;
    }
    coveredItemCount += 1;

    // One entry per partner for this item -- the cheapest priced offer,
    // else the first one seen.
    const bestByPartner = new Map<string, ItemOffer>();
    for (const offer of offers) {
      const current = bestByPartner.get(offer.partnerId);
      if (!current) {
        bestByPartner.set(offer.partnerId, offer);
        continue;
      }
      if (offer.priceHint === null) continue;
      if (current.priceHint === null || offer.priceHint < current.priceHint) {
        bestByPartner.set(offer.partnerId, offer);
      }
    }

    for (const offer of bestByPartner.values()) {
      let coverage = byPartner.get(offer.partnerId);
      if (!coverage) {
        coverage = {
          partnerId: offer.partnerId,
          partnerName: offer.partnerName,
          partnerLogoUrl: offer.partnerLogoUrl,
          integrationType: offer.integrationType,
          coveredItems: [],
          coveredCount: 0,
          pricedCount: 0,
          unpricedCount: 0,
          estimatedTotal: null,
        };
        byPartner.set(offer.partnerId, coverage);
      }

      coverage.coveredItems.push({
        itemId: item.id,
        itemName: item.name,
        quantity: item.quantity,
        offer,
        priceHint: offer.priceHint,
      });
      coverage.coveredCount += 1;
      if (offer.priceHint === null) {
        coverage.unpricedCount += 1;
      } else {
        coverage.pricedCount += 1;
        coverage.estimatedTotal = (coverage.estimatedTotal ?? 0) + offer.priceHint;
      }
    }
  }

  return {
    totalItems: items.length,
    partners: [...byPartner.values()].sort(comparePartnerCoverage),
    uncoveredItems,
    coveredItemCount,
  };
}

/**
 * Ordering rule for the "Onde comprar" partner block.
 *
 * There is deliberately no sponsorship dimension here: `campaigns` only
 * models `campaign_entity_type in ('SCHOOL','STORE')` (see
 * 20260910200700_monetization.sql), so no e-commerce partner can be
 * patrocinado today. Inventing a paid position would be exactly the
 * "mascarar patrocínio" RF-003 forbids. Papelarias keep their own
 * existing rule -- `nearby_stores()` orders by proximity group, distance
 * and name, and nothing here re-sorts that.
 *
 * So the order is deterministic and states its own criterion on screen:
 * 1. covers more of *this* list first (the question the block exists to answer);
 * 2. more of that coverage priced (a partner that tells you the price ranks
 *    above one that leaves you guessing at equal coverage);
 * 3. alphabetical (pt-BR) as the final, stable tie-break -- never insertion
 *    order, which would be arbitrary and unexplainable to a partner.
 */
function comparePartnerCoverage(a: PartnerCoverage, b: PartnerCoverage): number {
  if (b.coveredCount !== a.coveredCount) return b.coveredCount - a.coveredCount;
  if (b.pricedCount !== a.pricedCount) return b.pricedCount - a.pricedCount;
  return a.partnerName.localeCompare(b.partnerName, "pt-BR");
}

/**
 * Ordena as ofertas de UM item para a visão "comparar loja a loja":
 * preço indicado crescente primeiro (é o que "comparar" quer dizer),
 * ofertas sem preço depois, nome do parceiro como desempate estável.
 *
 * Antes essas ofertas saíam na ordem em que o PostgREST devolveu as
 * linhas -- estável na prática, mas arbitrária e impossível de explicar
 * a um parceiro. Aqui também não há dimensão de patrocínio, pelo mesmo
 * motivo de `comparePartnerCoverage`.
 */
export function sortOffersForComparison(offers: ItemOffer[]): ItemOffer[] {
  return [...offers].sort((a, b) => {
    if (a.priceHint === null && b.priceHint === null) {
      return a.partnerName.localeCompare(b.partnerName, "pt-BR");
    }
    if (a.priceHint === null) return 1;
    if (b.priceHint === null) return -1;
    if (a.priceHint !== b.priceHint) return a.priceHint - b.priceHint;
    return a.partnerName.localeCompare(b.partnerName, "pt-BR");
  });
}
