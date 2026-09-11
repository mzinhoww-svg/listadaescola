import { type ResolvedLocation, unresolvedLocation } from "./types";

// Server-only: only ever imported from resolve-location.ts (a "use
// server" module). Both providers below are free/keyless -- no secret to
// protect today -- but the call itself still only ever happens here,
// server-side, so a future keyed provider (see nominatim.ts) drops in
// without ever touching client code.

function normalizeCep(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}

interface BrasilApiCepResponse {
  cep?: string;
  state?: string;
  city?: string;
  location?: {
    coordinates?: {
      longitude?: string | number;
      latitude?: string | number;
    };
  };
}

interface ViaCepResponse {
  cep?: string;
  uf?: string;
  localidade?: string;
  erro?: boolean;
}

function toFiniteNumber(value: string | number | undefined): number | null {
  if (value === undefined) return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

async function fetchBrasilApi(cep: string): Promise<ResolvedLocation | null> {
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as BrasilApiCepResponse;
    const lat = toFiniteNumber(data.location?.coordinates?.latitude);
    const lon = toFiniteNumber(data.location?.coordinates?.longitude);
    if (!data.city && !data.state) return null;
    return {
      source: "cep",
      uf: data.state ?? null,
      municipality: data.city ?? null,
      lat,
      lon,
      cep,
      label: [data.city, data.state].filter(Boolean).join(" - "),
    };
  } catch {
    return null;
  }
}

async function fetchViaCep(cep: string): Promise<ResolvedLocation | null> {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepResponse;
    if (data.erro || !data.localidade) return null;
    return {
      source: "cep",
      uf: data.uf ?? null,
      municipality: data.localidade,
      lat: null,
      lon: null,
      cep,
      label: [data.localidade, data.uf].filter(Boolean).join(" - "),
    };
  } catch {
    return null;
  }
}

/**
 * Resolves a CEP to município/uf and, when available, coordinates.
 * Tries BrasilAPI first (sometimes carries coordinates), then falls back
 * to ViaCEP (address only, no coordinates). Never throws: an
 * unresolvable or malformed CEP returns `source: "unresolved"` rather
 * than fabricating a location.
 */
export async function resolveCep(rawCep: string): Promise<ResolvedLocation> {
  const cep = normalizeCep(rawCep);
  if (!cep) return unresolvedLocation(rawCep);

  const fromBrasilApi = await fetchBrasilApi(cep);
  if (fromBrasilApi?.lat !== null && fromBrasilApi?.lon !== null && fromBrasilApi) return fromBrasilApi;

  const fromViaCep = await fetchViaCep(cep);
  if (fromViaCep) return fromViaCep;

  if (fromBrasilApi) return fromBrasilApi;

  return unresolvedLocation(rawCep);
}
