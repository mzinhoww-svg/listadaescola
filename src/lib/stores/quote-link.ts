export interface StoreQuoteLinkParams {
  storeId: string;
  schoolId: string;
  /** Omitted when there's no specific list in context (school profile
   * cross-link) -- `/api/store/whatsapp` then builds a generic orçamento
   * message instead of the itemized one. */
  listId?: string;
}

/**
 * Single source of truth for the shape of the tracked papelaria link --
 * the WhatsApp-side twin of `CommerceProvider.buildTrackedHref`.
 *
 * It never builds a `wa.me` URL itself: the phone number always comes
 * from `stores.whatsapp` (admin-only-writable), resolved, validated and
 * normalized server-side inside `/api/store/whatsapp` (RF-012). These
 * params are lookup keys only, exactly like the commerce click endpoint's.
 */
export function buildStoreQuoteHref({ storeId, schoolId, listId }: StoreQuoteLinkParams): string {
  const params = new URLSearchParams({ store: storeId, school: schoolId });
  if (listId) params.set("list", listId);
  return `/api/store/whatsapp?${params.toString()}`;
}
