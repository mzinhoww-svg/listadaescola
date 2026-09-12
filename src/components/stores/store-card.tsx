import Link from "next/link";
import { Clock, MapPin, MessageCircle, ShoppingBag, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NearbyStore } from "@/lib/stores/nearby-stores";
import { storeHref } from "@/lib/stores/store-profile";

export interface StoreCardProps {
  store: NearbyStore;
  schoolId: string;
  /** Omitted from a context with no specific list (e.g. the school
   * profile's general "papelarias próximas" cross-link) -- the WhatsApp
   * message then falls back to a generic orçamento request instead of an
   * itemized one (see /api/store/whatsapp, `hasListContext`). */
  listId?: string;
}

/**
 * "Distância até a escola" (RN-009: never fabricated, so simply omitted
 * when the store or the school itself has no coordinates -- this is the
 * proximity-to-escola distance from nearby_stores(), never distance to
 * the visitor, since this flow never asks the visitor for their own
 * location).
 */
export function StoreCard({ store, schoolId, listId }: StoreCardProps) {
  const whatsappParams = new URLSearchParams({ store: store.id, school: schoolId });
  if (listId) whatsappParams.set("list", listId);
  const whatsappHref = store.whatsappNormalized ? `/api/store/whatsapp?${whatsappParams}` : null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <Link href={storeHref(store)} className="font-medium text-neutral-900 hover:text-primary-700 hover:underline">
          {store.name}
        </Link>
        {store.distanceKm !== null && (
          <Badge variant="neutral" className="shrink-0">
            {store.distanceKm} km da escola
          </Badge>
        )}
      </div>

      {store.address && (
        <p className="mt-1 flex items-start gap-1.5 text-sm text-neutral-600">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
          {store.address}
        </p>
      )}

      {store.openingHours && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-600">
          <Clock className="size-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
          {store.openingHours}
        </p>
      )}

      {(store.offersDelivery || store.offersPickup) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {store.offersDelivery && (
            <Badge variant="info">
              <Truck className="size-3" aria-hidden="true" />
              Entrega
            </Badge>
          )}
          {store.offersPickup && (
            <Badge variant="info">
              <ShoppingBag className="size-3" aria-hidden="true" />
              Retirada
            </Badge>
          )}
        </div>
      )}

      <div className="mt-3">
        {whatsappHref ? (
          <Button asChild variant="whatsapp" className="w-full sm:w-auto">
            <a href={whatsappHref} target="_blank" rel="nofollow noopener noreferrer">
              <MessageCircle className="size-4" aria-hidden="true" />
              Pedir orçamento no WhatsApp
            </a>
          </Button>
        ) : (
          <p className="text-sm text-neutral-500">WhatsApp indisponível para esta papelaria.</p>
        )}
      </div>
    </div>
  );
}
