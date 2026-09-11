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
  | "whatsapp_click"
  | "store_view"
  | "favorite_added"
  | "review_created"
  | "submission_started"
  | "submission_submitted"
  | "submission_approved";

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
