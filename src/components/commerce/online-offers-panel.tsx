import { TriangleAlert } from "lucide-react";

import { sortOffersForComparison, type ListCommerceCoverage, type CoverageListItem } from "@/lib/commerce/coverage";
import type { ItemOffer } from "@/lib/commerce/offers";
import { PartnerCoverageCard } from "@/components/commerce/partner-coverage-card";
import { PartnerOfferButton } from "@/components/commerce/partner-offer-button";

export interface OnlineOffersPanelProps {
  coverage: ListCommerceCoverage;
  items: CoverageListItem[];
  offersByItem: Map<string, ItemOffer[]>;
  schoolId: string;
  listId: string;
}

/** "3 cadernos" / "1 lápis" -- the quantity only shows when it's not 1. */
function itemLabel(item: CoverageListItem): string {
  return item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name;
}

/**
 * Corpo do "Comprar online". Onda 8 inverte a leitura: primeiro a
 * cobertura agregada por parceiro (quem resolve a maior parte da lista),
 * depois o detalhe item a item, e -- o que faltava -- os itens que
 * nenhum parceiro cobre, que antes simplesmente sumiam da seção e
 * deixavam o pai achando que a lista estava resolvida.
 *
 * Continua terminando exatamente onde terminava: link externo rastreado
 * (`/api/commerce/click`) por item. Nada aqui agrega uma compra, reserva
 * ou pagamento -- não existe "comprar tudo" porque não existe nada do
 * lado do Listada para comprar.
 */
export function OnlineOffersPanel({ coverage, items, offersByItem, schoolId, listId }: OnlineOffersPanelProps) {
  const { partners, uncoveredItems, totalItems } = coverage;

  if (partners.length === 0) {
    return (
      <p className="rounded-lg bg-surface-soft px-3 py-2.5 text-sm text-neutral-600">
        Nenhuma loja parceira tem oferta para os itens desta lista ainda. Por enquanto, o caminho é pedir orçamento
        numa papelaria — logo abaixo.
      </p>
    );
  }

  const itemsWithOffers = items.filter((item) => (offersByItem.get(item.id)?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-neutral-500">
          Ordenadas por quantos itens desta lista cada loja cobre. Nenhuma posição aqui é paga.
        </p>
        <div className="flex flex-col gap-3">
          {partners.map((partner) => (
            <PartnerCoverageCard
              key={partner.partnerId}
              coverage={partner}
              totalItems={totalItems}
              schoolId={schoolId}
              listId={listId}
            />
          ))}
        </div>
      </div>

      {/* Só faz sentido com 2+ parceiros: com um só, esta visão repetiria
          exatamente o conteúdo do cartão dele. Com dois ou mais, é a única
          forma de comparar quem vende o mesmo item. */}
      {partners.length > 1 && (
        <details className="group rounded-xl border border-neutral-200 bg-white">
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm font-medium text-primary-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
            <span className="group-open:hidden">Comparar loja a loja, item por item</span>
            <span className="hidden group-open:inline">Esconder comparação item por item</span>
          </summary>
          <div className="flex flex-col gap-4 border-t border-neutral-200 px-4 py-4">
            {itemsWithOffers.map((item) => (
              <div key={item.id}>
                <p className="mb-2 text-sm font-medium text-neutral-700">{itemLabel(item)}</p>
                <div className="flex flex-wrap gap-2">
                  {sortOffersForComparison(offersByItem.get(item.id)!).map((offer) => (
                    <PartnerOfferButton
                      key={offer.ecommerceProductId}
                      offer={offer}
                      schoolListItemId={item.id}
                      schoolId={schoolId}
                      listId={listId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {uncoveredItems.length > 0 && (
        <div className="rounded-xl border border-warning-500/25 bg-warning-50 p-4">
          <h4 className="flex items-start gap-2 text-sm font-semibold text-neutral-900">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-600" aria-hidden="true" />
            <span>
              {uncoveredItems.length === 1
                ? "1 item sem oferta de nenhuma loja parceira"
                : `${uncoveredItems.length} itens sem oferta de nenhuma loja parceira`}
            </span>
          </h4>
          <p className="mt-1 max-w-[65ch] text-sm text-neutral-700">
            Comprando online você não resolve a lista inteira. Estes itens precisam de outro caminho — a papelaria,
            logo abaixo, recebe a lista completa pelo WhatsApp.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {uncoveredItems.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-warning-500/25 bg-white px-2 py-1 text-xs text-neutral-700"
              >
                {itemLabel(item)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
