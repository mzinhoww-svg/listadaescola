export type LocationSource = "cep" | "municipality" | "coords" | "nominatim" | "unresolved";

/**
 * Result of resolving a user-entered location (CEP, cidade/bairro, or
 * browser geolocation) to something `nearby_schools()` can use. `lat`/
 * `lon` are only ever set when a real coordinate was found -- never
 * fabricated (PRD RN-009). When they're null, callers fall back to
 * `municipality`/`cep` filtering.
 */
export interface ResolvedLocation {
  source: LocationSource;
  uf: string | null;
  municipality: string | null;
  lat: number | null;
  lon: number | null;
  cep: string | null;
  label: string;
}

export function unresolvedLocation(label: string): ResolvedLocation {
  return { source: "unresolved", uf: null, municipality: null, lat: null, lon: null, cep: null, label };
}
