import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
