import { normalizeWhatsappNumber } from "@/lib/stores/whatsapp";

/**
 * Team contact channel for business inquiries (papelarias e e-commerces
 * que querem virar parceiros) -- separate from the per-store customer
 * WhatsApp CTA (RF-011/012), which always resolves its number from
 * `stores.whatsapp` and is tracked as the `whatsapp_click` analytics
 * event. This is B2B outreach, not part of that commerce funnel, so it
 * isn't counted in the same KPI and doesn't use the `whatsapp` button
 * color (design-system.md reserves that green exclusively for the
 * orçamento CTA, never as a generic action color).
 */
const TEAM_WHATSAPP_RAW = "(65) 99622-7110";

const TEAM_WHATSAPP_NORMALIZED = normalizeWhatsappNumber(TEAM_WHATSAPP_RAW);
if (!TEAM_WHATSAPP_NORMALIZED) {
  throw new Error("TEAM_WHATSAPP_RAW failed to normalize -- check src/lib/contact.ts");
}

export function buildTeamWhatsappLink(message: string): string {
  const url = new URL(`https://wa.me/${TEAM_WHATSAPP_NORMALIZED}`);
  url.searchParams.set("text", message);
  return url.toString();
}
