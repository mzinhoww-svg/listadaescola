/**
 * Validates a user-supplied `next`/redirect target so it can only ever
 * point back into this app — never off-site. Used for post-login returns
 * (`?next=`) and the auth callback route. Guards against the classic
 * open-redirect tricks: absolute URLs, protocol-relative `//host`,
 * backslash variants browsers normalize to `//`, and embedded `://`.
 */
export function getSafeRedirect(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.includes("://")) return fallback;

  try {
    const url = new URL(next, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    return `${url.pathname}${url.search}${url.hash}` || fallback;
  } catch {
    return fallback;
  }
}
