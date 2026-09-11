import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Prompt 17 (E2E tests) finding: Next.js's own platform-level request
   * body cap defaults to ~10MB and truncates the multipart body BEFORE
   * `/api/contributions/attachments` ever runs its own size check
   * (MAX_ATTACHMENT_SIZE_BYTES, src/lib/contributions/constants.ts) --
   * confirmed live: a >10MB upload threw inside `request.formData()`
   * (truncated body is no longer valid multipart) and surfaced as a raw
   * 500, never reaching the route's own clean 400 "O arquivo deve ter no
   * máximo 10MB" response. Raised just above the app's real limit so
   * that check is reachable; the app's own limit (plus the Storage
   * bucket's native file_size_limit, supabase/migrations/20260910201800_storage.sql)
   * is still what actually enforces 10MB -- this only stops the
   * platform's cap from firing first and turning a clean validation
   * error into an unhandled exception.
   */
  experimental: {
    proxyClientMaxBodySize: "11mb",
  },
  /**
   * Prompt 16 (security audit) finding: no security headers were set
   * anywhere (confirmed -- neither here, nor a vercel.json, nor the
   * proxy/middleware). These three are safe additions with zero risk of
   * breaking functionality -- no page in this app is meant to be framed,
   * and no code relies on referrers leaking cross-origin.
   *
   * A Content-Security-Policy is deliberately NOT included here: this
   * app's map tile provider is intentionally runtime-configurable
   * (NEXT_PUBLIC_MAP_STYLE_URL/NEXT_PUBLIC_MAP_TILE_URL_TEMPLATE, see
   * src/lib/map/config.ts) rather than a fixed host, and Next.js App
   * Router's own inline hydration scripts need either 'unsafe-inline'
   * (which defeats most of a CSP's script-src protection) or a nonce
   * wired through middleware -- a real feature of its own, not a
   * mechanical audit fix, and not safely verifiable end-to-end against
   * the actual deployed environment from here. See
   * docs/security/final-audit.md for the full reasoning; a nonce-based
   * CSP is the recommended follow-up once a stable set of pages has been
   * exercised against it in a real browser.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
