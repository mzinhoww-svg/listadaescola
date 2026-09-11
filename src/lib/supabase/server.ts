import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase client for Server Components, Server Actions and Route
 * Handlers. Reads/writes the SSR auth cookies via `next/headers`.
 *
 * A Server Component can't set cookies (Next.js throws), so `setAll` is
 * wrapped in try/catch there — the middleware is what actually persists
 * refreshed session cookies on those requests.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — the middleware refreshes
            // the session cookie for these requests instead.
          }
        },
      },
    }
  );
}
