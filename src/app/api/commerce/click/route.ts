import { NextResponse } from "next/server";

import { createPublicClient } from "@/lib/supabase/public";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string | null): value is string {
  return value !== null && UUID_RE.test(value);
}

/** Only ever redirects to an absolute http(s) URL -- never a scheme like `javascript:`/`data:`. */
function parseTrustedExternalUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * The only outbound path for e-commerce partner links (Prompt 08,
 * PRD RF-010). Never trusts a destination carried in the request --
 * `product` is only ever a lookup key. The real URL always comes from
 * `ecommerce_products.external_url`, a column only admins can write
 * (RLS `ecommerce_products_admin_all`), which is what makes this
 * open-redirect-safe (SEC-009): a caller can make this endpoint redirect
 * to *an* active partner offer, never to an arbitrary URL of their
 * choosing.
 *
 * `commerce_click` is awaited (not fire-and-forget like most analytics
 * calls in this codebase) because this is a Route Handler that ends the
 * instant it returns its response -- unlike a rendered page, there's no
 * guarantee the runtime stays alive long enough to flush a detached
 * insert after the redirect response is sent.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const productId = searchParams.get("product");
  const itemId = searchParams.get("item");
  const schoolId = searchParams.get("school");
  const listId = searchParams.get("list");

  if (!isUuid(productId)) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const supabase = createPublicClient();
  const { data: offer } = await supabase
    .from("ecommerce_products")
    .select("id, external_url, ecommerce_partners!inner (id)")
    .eq("id", productId)
    .eq("is_active", true)
    .eq("ecommerce_partners.is_active", true)
    .maybeSingle();

  // Offer went inactive/was removed between page render and click --
  // never fabricate a destination, just send the visitor home.
  if (!offer) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const destination = parseTrustedExternalUrl(offer.external_url);
  if (!destination) {
    return NextResponse.redirect(new URL("/", origin));
  }

  await recordAnalyticsEvent({
    eventType: "commerce_click",
    schoolId: isUuid(schoolId) ? schoolId : undefined,
    listId: isUuid(listId) ? listId : undefined,
    partnerId: offer.ecommerce_partners.id,
    metadata: { ecommerceProductId: offer.id, schoolListItemId: isUuid(itemId) ? itemId : null },
  });

  return NextResponse.redirect(destination);
}
