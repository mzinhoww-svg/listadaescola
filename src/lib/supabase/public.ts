import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Plain anon-key client with no cookie/session binding. Use this (never
 * `server.ts`'s `createClient`) for reads that don't depend on who's
 * asking -- e.g. inside `unstable_cache`, where Next.js disallows calling
 * `cookies()`. Only ever reads data the `anon` role can already see under
 * RLS; never use it for anything ownership/session-scoped.
 */
export function createPublicClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createSupabaseClient<Database>(url, anonKey, { auth: { persistSession: false } });
}
