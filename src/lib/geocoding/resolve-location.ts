"use server";

import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";
import { recordAnalyticsEvent } from "@/lib/analytics/record-event";
import { resolveCep } from "./cep";
import { matchMunicipality } from "./municipality";
import { searchPlace } from "./nominatim";
import { type ResolvedLocation, unresolvedLocation } from "./types";

const DEFAULT_UF = "MT";

function looksLikeCep(input: string): boolean {
  return input.replace(/\D/g, "").length === 8;
}

// Known municípios barely change (only on a fresh INEP import) -- caching
// this avoids re-fetching ~2.7k rows on every free-text location search.
// Uses the cookie-less public client: unstable_cache forbids cookies().
const getKnownMunicipalities = unstable_cache(
  async (uf: string): Promise<string[]> => {
    const supabase = createPublicClient();
    const { data } = await supabase.from("schools").select("municipality").eq("uf", uf).eq("is_active", true);
    const unique = new Set((data ?? []).map((row) => row.municipality).filter((m): m is string => Boolean(m)));
    return Array.from(unique).sort();
  },
  ["known-municipalities"],
  { revalidate: 3600, tags: ["schools-municipalities"] }
);

/**
 * Resolves free text (CEP or cidade/bairro) to a location. CEP-shaped
 * input goes through resolveCep (BrasilAPI/ViaCEP); everything else is
 * matched against our own known municípios first, falling back to
 * Nominatim only when that misses. Never throws and never fabricates a
 * coordinate (PRD RN-009) -- an unresolvable query comes back as
 * `source: "unresolved"` so the caller can fall back to a plain uf
 * listing.
 */
export async function resolveLocationByTextAction(
  rawInput: string,
  uf: string = DEFAULT_UF
): Promise<ResolvedLocation> {
  const input = rawInput.trim();
  if (!input) return unresolvedLocation(rawInput);

  let resolved: ResolvedLocation;
  if (looksLikeCep(input)) {
    resolved = await resolveCep(input);
  } else {
    const known = await getKnownMunicipalities(uf);
    resolved = matchMunicipality(input, known, uf) ?? (await searchPlace(`${input}, ${uf}, Brasil`));
  }

  void recordAnalyticsEvent({
    eventType: "location_search",
    metadata: { query: input, uf, source: resolved.source },
  });

  return resolved;
}

/**
 * "Localizar-me": the browser already gives the most accurate coordinate
 * available, so this never calls an external geocoder -- it only asks
 * our own `nearby_schools()` for the closest active school to attach a
 * friendly município label. The label is best-effort only; the returned
 * lat/lon are always the browser's own, real coordinates.
 */
export async function resolveLocationByCoordsAction(lat: number, lon: number): Promise<ResolvedLocation> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return unresolvedLocation("Localização atual");
  }

  const supabase = createPublicClient();
  const { data } = await supabase.rpc("nearby_schools", { p_lat: lat, p_lon: lon, p_limit: 1 });
  const nearest = data?.[0];

  void recordAnalyticsEvent({
    eventType: "location_detected",
    metadata: { municipality: nearest?.municipality ?? null },
  });

  return {
    source: "coords",
    uf: nearest?.uf ?? null,
    municipality: nearest?.municipality ?? null,
    lat,
    lon,
    cep: null,
    label: nearest?.municipality ? `Perto de ${nearest.municipality}` : "Sua localização atual",
  };
}
