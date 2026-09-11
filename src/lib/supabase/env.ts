/**
 * Prompt 19 (produção): every Supabase client here used to read these two
 * vars with a bare `!` non-null assertion -- zero runtime safety. A
 * misconfigured Vercel environment (var missing, wrong project linked)
 * would pass `undefined` straight into `createServerClient`/`createClient`
 * and fail with a cryptic, hard-to-diagnose error deep inside the SDK, on
 * every single request (this is read in `proxy.ts`, which runs on every
 * request). Failing loud, once, with the exact missing var name and where
 * to fix it, turns a confusing production incident into an obvious one.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Set them in Vercel (Project Settings -> Environment Variables) for " +
        "production/preview, or in .env.local for local development (see .env.example)."
    );
  }

  return { url: url!, anonKey: anonKey! };
}
