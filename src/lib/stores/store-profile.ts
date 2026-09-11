import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import { slugify } from "@/lib/utils";

export interface StoreContact {
  contactType: string;
  value: string;
}

export function storeHref(store: { uf: string; municipality: string; slug: string }): string {
  return `/papelarias/${store.uf.toLowerCase()}/${slugify(store.municipality)}/${store.slug}`;
}

export interface StoreProfile {
  id: string;
  name: string;
  slug: string;
  uf: string;
  municipality: string;
  address: string | null;
  whatsapp: string;
  openingHours: string | null;
  offersDelivery: boolean;
  offersPickup: boolean;
  isSponsored: boolean;
  latitude: number | null;
  longitude: number | null;
  contacts: StoreContact[];
  services: string[];
}

/**
 * Public papelaria detail page (Prompt 15, PRD §14 "papelaria" indexable).
 * `React.cache()` so generateMetadata + the page body share one query,
 * same pattern as getSchoolBySlug/getListBySlug. Only `is_public` contacts
 * are exposed -- `store_contacts` also holds internal-only entries (see
 * papelaria-whatsapp.md), never meant for a public, crawlable page.
 */
export const getStoreBySlug = cache(async (slug: string): Promise<StoreProfile | null> => {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("stores")
    .select(
      `id, name, slug, uf, municipality, address, whatsapp, opening_hours, offers_delivery, offers_pickup,
       is_sponsored, latitude, longitude,
       store_contacts (contact_type, value, is_public),
       store_services (service)`
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`getStoreBySlug failed: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    uf: data.uf,
    municipality: data.municipality,
    address: data.address,
    whatsapp: data.whatsapp,
    openingHours: data.opening_hours,
    offersDelivery: data.offers_delivery,
    offersPickup: data.offers_pickup,
    isSponsored: data.is_sponsored,
    latitude: data.latitude,
    longitude: data.longitude,
    contacts: data.store_contacts.filter((contact) => contact.is_public).map((contact) => ({
      contactType: contact.contact_type,
      value: contact.value,
    })),
    services: data.store_services.map((service) => service.service),
  };
});

export interface StoreListItem {
  id: string;
  name: string;
  slug: string;
  uf: string;
  municipality: string;
  address: string | null;
}

// Prompt 18 (performance audit): unbounded before -- see admin/lists.ts's
// MAX_ROWS comment for the reasoning. Stores are admin-curated (not
// bulk-imported like schools), so 500 has real headroom; the sitemap uses
// its own paginated getAllActiveStoreEntries (sitemap-data.ts), not this
// function, so capping this one doesn't touch sitemap completeness.
const MAX_ROWS = 500;

/** Papelarias index page -- every active store in the given UF. */
export async function getActiveStores(uf: string): Promise<StoreListItem[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, slug, uf, municipality, address")
    .eq("uf", uf)
    .eq("is_active", true)
    .order("municipality", { ascending: true })
    .order("name", { ascending: true })
    .range(0, MAX_ROWS - 1);

  if (error) throw new Error(`getActiveStores failed: ${error.message}`);
  return data ?? [];
}
