import { type ResolvedLocation, unresolvedLocation } from "./types";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
  };
}

/**
 * Last-resort free-text geocoding, via OSM Nominatim's public instance,
 * scoped to Brazil. Only reached after the free município match (see
 * municipality.ts) finds nothing -- one request per unresolved search,
 * never a loop/bulk call, with a proper User-Agent, which keeps this
 * inside Nominatim's "reasonable use" policy.
 *
 * `GEOCODING_API_KEY` (server-only, see .env.example) is reserved for a
 * future keyed OSM-derived provider (e.g. LocationIQ/Geoapify) that would
 * replace this call without touching any caller -- not required for the
 * current default.
 */
export async function searchPlace(query: string): Promise<ResolvedLocation> {
  const trimmed = query.trim();
  if (!trimmed) return unresolvedLocation(query);

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", trimmed);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url, {
      headers: { "User-Agent": "ListadaEscola/1.0 (+https://listadaescola.com.br)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return unresolvedLocation(query);

    const results = (await res.json()) as NominatimResult[];
    const first = results[0];
    if (!first) return unresolvedLocation(query);

    const lat = Number(first.lat);
    const lon = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return unresolvedLocation(query);

    const municipality =
      first.address?.city ?? first.address?.town ?? first.address?.village ?? first.address?.municipality ?? null;

    return {
      source: "nominatim",
      uf: first.address?.state ?? null,
      municipality,
      lat,
      lon,
      cep: null,
      label: first.display_name,
    };
  } catch {
    return unresolvedLocation(query);
  }
}
