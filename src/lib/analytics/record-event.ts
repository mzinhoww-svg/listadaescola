"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type AnalyticsEventType =
  | "location_search"
  | "location_detected"
  | "school_search"
  | "school_impression"
  | "school_view"
  | "list_view"
  | "list_share"
  | "commerce_click"
  // Onda 8: um evento por parceiro exibido no bloco de cobertura agregada
  // da lista (o denominador que faltava para o CTR real de `commerce_click`
  // por parceiro). Mesmo padrão de `school_impression`.
  | "commerce_coverage_impression"
  | "whatsapp_click"
  // Onda 8: o usuário decidiu pedir o mesmo orçamento a N papelarias.
  // Cada conversa aberta continua gerando seu próprio `whatsapp_click`.
  | "whatsapp_compare_started"
  | "store_view"
  | "favorite_added"
  | "review_created"
  | "submission_started"
  | "submission_submitted"
  | "submission_approved"
  | "home_list_request_click"
  | "page_view";

export interface RecordAnalyticsEventInput {
  eventType: AnalyticsEventType;
  schoolId?: string;
  storeId?: string;
  listId?: string;
  partnerId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * The only write path into analytics_events (RF-015) -- the table itself
 * has no anon/authenticated policy at all, only record_analytics_event()
 * (SECURITY DEFINER, validated event_type) can write it. Uses the
 * cookie-aware client so `auth.uid()` resolves for logged-in users; still
 * works anonymously (profile_id stays NULL, exactly as intended --
 * "consulta sem login").
 *
 * Never blocks or fails the page it's called from: analytics is
 * best-effort, a failure here is logged and swallowed, not surfaced.
 * `session_id` correlation across anonymous visits isn't implemented yet
 * -- deferred to Prompt 14 (dedicated analytics prompt), out of scope for
 * the home/busca/resultados journey this records events for.
 */
export async function recordAnalyticsEvent(input: RecordAnalyticsEventInput): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("record_analytics_event", {
      p_event_type: input.eventType,
      p_school_id: input.schoolId,
      p_store_id: input.storeId,
      p_list_id: input.listId,
      p_partner_id: input.partnerId,
      p_metadata: (input.metadata ?? {}) as Json,
    });
    if (error) throw error;
  } catch (err) {
    console.error("recordAnalyticsEvent failed", input.eventType, err);
  }
}

/** One event per school actually rendered, batched into one round-trip. */
export async function recordSchoolImpressions(schoolIds: string[], metadata?: Record<string, unknown>): Promise<void> {
  await Promise.all(
    schoolIds.map((schoolId) => recordAnalyticsEvent({ eventType: "school_impression", schoolId, metadata }))
  );
}

/**
 * Roadmap Tier 4 - D4: generic pageview for the 14 public pages that had
 * zero tracking (home, UF/city listings, every institutional page) --
 * school_search/school_view/list_view already cover their own screens, so
 * this is only ever called from pages with no dedicated event.
 */
export async function recordPageView(path: string): Promise<void> {
  await recordAnalyticsEvent({ eventType: "page_view", metadata: { path } });
}
