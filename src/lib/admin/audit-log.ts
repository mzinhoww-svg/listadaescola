import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export interface AuditLogEntry {
  id: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Json | null;
  after: Json | null;
  createdAt: string;
}

// Same reasoning as admin/sales.ts's MAX_ROWS (Prompt 18 performance
// audit): audit_logs is written from 30+ call sites across the admin
// surface and never archived -- an unbounded SELECT here is the same
// unbounded-growth risk, just not yet exercised in production (0 rows as
// of this page's first version).
export const MAX_ROWS = 200;

/**
 * Roadmap C5: audit_logs is written from every admin mutation
 * (`admin_reject_review`, `admin_publish_list`, moderation, sponsorship,
 * etc.) but until this page, nothing in the app ever read it back --
 * `grep audit_logs` in `src/` only matched the generated types file.
 * `audit_logs_admin_read` (RLS) already gates this to admins; no new
 * policy needed, only the missing screen.
 */
export async function getAuditLogEntries(): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, before, after, created_at, profiles (full_name)")
    .order("created_at", { ascending: false })
    .range(0, MAX_ROWS - 1);

  if (error) throw new Error(`getAuditLogEntries failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    actorName: row.profiles?.full_name ?? null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    before: row.before,
    after: row.after,
    createdAt: row.created_at,
  }));
}
