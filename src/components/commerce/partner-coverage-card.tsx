import { ExternalLink } from "lucide-react";

import { CommerceProvider } from "@/lib/commerce/provider";
import type { PartnerCoverage } from "@/lib/commerce/coverage";
import { formatCurrency } from "@/lib/utils";

export interface PartnerCoverageCardProps {
  coverage: PartnerCoverage;
  totalItems: number;
  schoolId: string;
  listId: string;
}

/**
 * One partner's coverage of the WHOLE list -- "esta loja cobre 12 dos 18
 * itens" -- instead of one isolated decision per item. It is a summary of
 * links, never a cart: there is no combined "comprar tudo" action because
 * no such thing exists (the schema maps a partner to individual products,
 * and every purchase happens on the partner's own site). Expanding the
 * card gives one tracked outbound link per covered item, exactly as
 * before; what's new is being able to answer "qual loja resolve a maior
 * parte da minha lista?" before opening anything.
 *
 * The estimate is deliberately hedged in visible text: it is the sum of
 * the partner's own `price_hint`s, it says how many items it covers and
 * how many have no price, and it never appears at all when no covered
 * item is priced (see `buildListCommerceCoverage`). Listada charges
 * nothing and processes no payment -- the card must never read like a
 * total to pay here.
 */
export function PartnerCoverageCard({ coverage, totalItems, schoolId, listId }: PartnerCoverageCardProps) {
  const cta = CommerceProvider.ctaFor(coverage.integrationType);
  const percent = totalItems > 0 ? Math.round((coverage.coveredCount / totalItems) * 100) : 0;
  const coverageLabel = `Cobre ${coverage.coveredCount} de ${totalItems} ${totalItems === 1 ? "item" : "itens"} desta lista`;

  return (
    <article className="flex flex-col rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start gap-3">
        {coverage.partnerLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo_url is an arbitrary admin-entered external host, no next/image remotePatterns configured.
          <img src={coverage.partnerLogoUrl} alt="" className="size-8 shrink-0 rounded object-contain" />
        ) : null}
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-medium text-neutral-900">{coverage.partnerName}</h4>
          <p className="text-sm text-neutral-600">
            Cobre{" "}
            <span className="font-medium text-neutral-900">
              {coverage.coveredCount} de {totalItems}
            </span>{" "}
            {totalItems === 1 ? "item" : "itens"} desta lista
          </p>
        </div>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-secondary-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={coverageLabel}
      >
        <div className="h-full rounded-full bg-secondary-300" style={{ width: `${percent}%` }} />
      </div>

      {/* Painel neutro, não `surface-soft`: DESIGN.md reserva o periwinkle a
          no máximo um elemento por bloco visual, e neste cartão esse
          elemento é o medidor de cobertura acima. */}
      <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
        {coverage.estimatedTotal !== null ? (
          <>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm text-neutral-700">Estimativa do parceiro:</span>
              <span className="text-lg font-semibold text-neutral-900">
                {formatCurrency(coverage.estimatedTotal)}
              </span>
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              Soma dos preços que o parceiro indicou para{" "}
              {coverage.pricedCount === 1 ? "1 item" : `${coverage.pricedCount} itens`} — preço por unidade, sem
              multiplicar pela quantidade da lista.
              {coverage.unpricedCount > 0 &&
                ` Outros ${coverage.unpricedCount === 1 ? "1 item coberto está" : `${coverage.unpricedCount} itens cobertos estão`} sem preço informado e não entraram na conta.`}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              Não é preço final nem cobrança do Listada: você compra no site do parceiro.
            </p>
          </>
        ) : (
          <p className="text-xs text-neutral-600">
            O parceiro não informou preço para nenhum destes itens, então não dá para estimar o valor — confira no
            site dele.
          </p>
        )}
      </div>

      <details className="group mt-3">
        <summary className="cursor-pointer list-none rounded-lg py-2 text-sm font-medium text-primary-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
          <span className="group-open:hidden">
            Ver {coverage.coveredCount === 1 ? "o item coberto" : `os ${coverage.coveredCount} itens cobertos`}
          </span>
          <span className="hidden group-open:inline">Esconder itens cobertos</span>
        </summary>

        <ul className="mt-1 flex flex-col divide-y divide-neutral-200 border-t border-neutral-200">
          {coverage.coveredItems.map((covered) => (
            <li key={covered.itemId}>
              <a
                href={CommerceProvider.buildTrackedHref({
                  ecommerceProductId: covered.offer.ecommerceProductId,
                  schoolListItemId: covered.itemId,
                  schoolId,
                  listId,
                })}
                target="_blank"
                rel="nofollow noopener noreferrer"
                title={`${cta.label} em ${coverage.partnerName} — ${cta.description}. Você sairá do Listada Escola.`}
                className="flex min-h-11 items-center gap-2 py-2 text-sm hover:text-primary-700"
              >
                <span className="min-w-0 flex-1 text-neutral-700">
                  {covered.quantity > 1 ? `${covered.quantity}x ` : ""}
                  {covered.itemName}
                </span>
                {covered.priceHint !== null && (
                  <span className="shrink-0 font-medium text-neutral-900">{formatCurrency(covered.priceHint)}</span>
                )}
                <ExternalLink className="size-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
