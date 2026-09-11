import type { ResolvedLocation } from "@/lib/geocoding/types";

/** Builds a new /escolas query string from the current one plus updates; null/'' deletes a key. Changing anything except page resets pagination. */
export function buildResultsUrl(current: URLSearchParams, updates: Record<string, string | null>): string {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  }
  if (!("page" in updates)) params.delete("page");
  return `/escolas?${params.toString()}`;
}

export function locationToResultsUrl(location: ResolvedLocation): string {
  const params = new URLSearchParams();
  if (location.uf) params.set("uf", location.uf);
  if (location.lat !== null) params.set("lat", String(location.lat));
  if (location.lon !== null) params.set("lon", String(location.lon));
  if (location.municipality) params.set("municipality", location.municipality);
  if (location.cep) params.set("cep", location.cep);
  params.set("label", location.label);
  return `/escolas?${params.toString()}`;
}
