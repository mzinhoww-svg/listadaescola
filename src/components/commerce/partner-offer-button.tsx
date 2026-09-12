import { ExternalLink } from "lucide-react";

import { CommerceProvider } from "@/lib/commerce/provider";
import type { ItemOffer } from "@/lib/commerce/offers";
import { formatCurrency } from "@/lib/utils";

export interface PartnerOfferButtonProps {
  offer: ItemOffer;
  schoolListItemId: string;
  schoolId: string;
  listId: string;
}

/**
 * One partner's CTA for one list item. Plain `<a>` (not `next/link`) on
 * purpose -- this must never be prefetched, and it must be a real
 * navigation so it works with JS disabled and is safe to open in a new
 * tab. `rel="nofollow"` because this is a tracked outbound redirect, not
 * an endorsed page; `noopener` because of `target="_blank"`.
 */
export function PartnerOfferButton({ offer, schoolListItemId, schoolId, listId }: PartnerOfferButtonProps) {
  const cta = CommerceProvider.ctaFor(offer.integrationType);
  const href = CommerceProvider.buildTrackedHref({
    ecommerceProductId: offer.ecommerceProductId,
    schoolListItemId,
    schoolId,
    listId,
  });

  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow noopener noreferrer"
      title={`${cta.label} em ${offer.partnerName} — ${cta.description}. Você sairá do Listada Escola.`}
      className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm hover:border-primary-300 hover:bg-primary-50"
    >
      {offer.partnerLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo_url is an arbitrary admin-entered external host, no next/image remotePatterns configured.
        <img src={offer.partnerLogoUrl} alt="" className="size-6 shrink-0 rounded object-contain" />
      ) : null}
      <span className="flex flex-col">
        <span className="font-medium text-neutral-900">{offer.partnerName}</span>
        <span className="text-xs text-neutral-500">{cta.label}</span>
      </span>
      {offer.priceHint !== null && (
        <span className="ml-auto shrink-0 text-sm font-medium text-neutral-700">
          {formatCurrency(offer.priceHint)}
        </span>
      )}
      <ExternalLink className="size-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
    </a>
  );
}
