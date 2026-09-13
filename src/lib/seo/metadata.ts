/**
 * Shared Open Graph defaults -- spread into every page's own `openGraph`
 * object, not just the root layout's. Next.js metadata does not deep-merge
 * `openGraph` between a layout and a page that also sets it (the page's
 * object fully replaces the layout's), and every indexable page here sets
 * its own `openGraph`, so declaring these only on the root layout would be
 * silently ignored everywhere it matters.
 */
export const OG_DEFAULTS = {
  siteName: "Listada Escola",
  locale: "pt_BR",
} as const;

const ENTITY_NAME_TITLE_MAX = 55;

/**
 * "<name> — <cidade>/<uf>" when the name alone still leaves room for the
 * "· Listada Escola" suffix (root layout's title template) without risking
 * SERP truncation; drops the city/UF suffix instead of truncating
 * mid-name when the name alone is already long (common with official INEP
 * school names).
 */
export function buildEntityTitle(name: string, municipality: string, uf: string): string {
  if (name.length > ENTITY_NAME_TITLE_MAX) return name;
  return `${name} — ${municipality}/${uf}`;
}
