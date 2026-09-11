import type { ResolvedLocation } from "./types";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

/**
 * Matches free text against a known list of municípios -- no external
 * call, just our own already-trusted MT data. Exact match
 * (accent/case-insensitive) first; if that misses, a substring match
 * only counts when it's unambiguous (exactly one candidate). Returns
 * `null` (not "unresolved") on a miss or an ambiguous match, so the
 * caller can fall through to Nominatim instead of reporting a false
 * negative.
 */
export function matchMunicipality(
  query: string,
  knownMunicipalities: string[],
  uf: string
): ResolvedLocation | null {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return null;

  const toResult = (municipality: string): ResolvedLocation => ({
    source: "municipality",
    uf,
    municipality,
    lat: null,
    lon: null,
    cep: null,
    label: `${municipality} - ${uf}`,
  });

  const exact = knownMunicipalities.find((m) => normalize(m) === normalizedQuery);
  if (exact) return toResult(exact);

  const partial = knownMunicipalities.filter((m) => normalize(m).includes(normalizedQuery));
  if (partial.length === 1) return toResult(partial[0]);

  return null;
}
