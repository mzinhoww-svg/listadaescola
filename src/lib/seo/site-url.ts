/**
 * Static (module-scope-safe) site base URL, for `metadataBase` and
 * absolute URLs inside JSON-LD -- both are evaluated outside a request,
 * so neither can read `x-forwarded-host` the way
 * `src/lib/auth/actions.ts`'s request-scoped `getSiteUrl()` does for auth
 * email redirect links (that one must match the exact host so Supabase
 * Auth's redirect allow-list keeps working across previews; this one only
 * needs to be a stable, real URL for crawlers/social scrapers).
 */
export function getSiteBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
