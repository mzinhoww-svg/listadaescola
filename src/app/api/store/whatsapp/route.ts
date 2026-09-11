import { NextResponse } from "next/server";

import { createPublicClient } from "@/lib/supabase/public";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";
import { buildWhatsappMessage, normalizeWhatsappNumber } from "@/lib/stores/whatsapp";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string | null): value is string {
  return value !== null && UUID_RE.test(value);
}

/**
 * The only outbound path for "Comprar local" (Prompt 09, PRD RF-011/012).
 * `store`/`school`/`list` are only ever lookup keys -- the phone number
 * always comes from `stores.whatsapp` (admin-only-writable) resolved
 * here server-side, normalized and validated (RF-012) before any link is
 * built. wa.me only pre-fills WhatsApp's own compose screen; it never
 * sends on its own ("não enviar automaticamente").
 *
 * `whatsapp_click` is awaited, same reasoning as `/api/commerce/click`:
 * this Route Handler ends the instant it returns its redirect response,
 * so a detached insert risks never flushing.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const storeId = searchParams.get("store");
  const schoolId = searchParams.get("school");
  const listId = searchParams.get("list");

  if (!isUuid(storeId) || !isUuid(schoolId) || !isUuid(listId)) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const supabase = createPublicClient();

  const [{ data: store }, { data: school }, { data: list }] = await Promise.all([
    supabase.from("stores").select("name, whatsapp").eq("id", storeId).eq("is_active", true).maybeSingle(),
    supabase.from("schools").select("name").eq("id", schoolId).maybeSingle(),
    supabase.from("school_lists").select("series_name, school_year").eq("id", listId).eq("status", "APPROVED").maybeSingle(),
  ]);

  if (!store || !school || !list) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const normalizedPhone = normalizeWhatsappNumber(store.whatsapp);
  if (!normalizedPhone) {
    // Never generate a link from a phone number we can't trust.
    return NextResponse.redirect(new URL("/", origin));
  }

  const { data: version } = await supabase
    .from("school_list_versions")
    .select("id, school_list_items (name, quantity, unit)")
    .eq("school_list_id", listId)
    .eq("status", "PUBLISHED")
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!version || version.school_list_items.length === 0) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const message = buildWhatsappMessage({
    schoolName: school.name,
    seriesName: list.series_name,
    schoolYear: list.school_year,
    items: version.school_list_items,
  });

  await recordAnalyticsEvent({
    eventType: "whatsapp_click",
    schoolId,
    listId,
    storeId,
  });

  const destination = new URL(`https://wa.me/${normalizedPhone}`);
  destination.searchParams.set("text", message);
  return NextResponse.redirect(destination);
}
