"use server";

import { recordAnalyticsEvent } from "@/lib/analytics/record-event";
import { getKnownMunicipalities } from "@/lib/geocoding/known-municipalities";
import { looksLikeCep } from "@/lib/geocoding/looks-like-cep";
import { matchMunicipality } from "@/lib/geocoding/municipality";
import { searchPlace } from "@/lib/geocoding/nominatim";
import { resolveLocationByTextAction } from "@/lib/geocoding/resolve-location";
import { locationToResultsUrl } from "@/lib/schools/results-url";
import { searchSchools } from "@/lib/schools/search-schools";
import { schoolHref } from "@/components/schools/school-card";

const INLINE_RESULT_LIMIT = 6;

export interface HomeSearchSchool {
  id: string;
  name: string;
  municipality: string;
  uf: string;
  href: string;
  listCount: number;
}

export type HomeSearchResult =
  /** É um lugar (CEP, cidade ou, no último recurso, um ponto do OSM): quem manda para /escolas é o cliente. */
  | { kind: "location"; url: string; label: string }
  /** É nome de escola e achamos escolas: a home responde ali mesmo, sem tirar a pessoa da página. */
  | { kind: "schools"; query: string; schools: HomeSearchSchool[]; totalCount: number; allResultsUrl: string }
  /** Não é lugar conhecido nem casa com nenhuma escola. Diz isso, não inventa resultado. */
  | { kind: "not-found"; query: string }
  | { kind: "empty" };

/**
 * Onda 3 -- a busca única da home.
 *
 * Antes havia dois caminhos concorrentes no mesmo cartão: `LocationInput`
 * ("CEP ou cidade", botão "Buscar") e `HomeNameSearch` ("ou busque pelo
 * nome da escola", botão "Buscar escola"). Cinco controles, dois botões
 * quase homônimos, e a obrigação de a pessoa classificar o que tem na mão
 * ANTES de digitar -- errar o campo dava "não encontramos essa
 * localização" para quem digitou o nome certo de uma escola. A
 * classificação é trabalho de máquina, não de quem está com pressa.
 *
 * A ordem da detecção é do mais determinístico para o mais chutado, e cada
 * degrau só existe porque o anterior não pode errar:
 *
 *   1. 8 dígitos  -> é CEP, não há ambiguidade possível. Resolve por
 *                    BrasilAPI/ViaCEP (nunca inventa coordenada, RN-009).
 *   2. município conhecido -> comparado com a NOSSA lista de municípios do
 *                    INEP, não com um geocoder. Exato ou substring sem
 *                    ambiguidade; qualquer dúvida cai para o próximo.
 *   3. nome de escola -> busca de verdade em `search_schools`. Ordenada
 *                    por `lists` (Onda 2) porque a pergunta por trás do
 *                    nome é "e a lista?", não "e o ranking?".
 *   4. nada casou -> só aí o Nominatim, para bairro/ponto de referência
 *                    ("Coxipó"), que não é município nem nome de escola.
 *                    Fica por último exatamente porque ele sempre acha
 *                    ALGUMA coisa, e um palpite de geocoder sobre um nome
 *                    de escola é pior do que dizer que não achamos.
 *
 * O botão "Usar minha localização" continua separado no componente: é
 * outra ação (o navegador dá a coordenada), não outro caminho de busca.
 */
export async function homeSearchAction(rawQuery: string, uf = "MT"): Promise<HomeSearchResult> {
  const query = rawQuery.trim().slice(0, 120);
  if (!query) return { kind: "empty" };

  // 1. CEP -- delegado a resolveLocationByTextAction, que para entrada com
  // 8 dígitos roda só o caminho de CEP (nenhum risco de cair no geocoder)
  // e já registra o evento location_search.
  if (looksLikeCep(query)) {
    const resolved = await resolveLocationByTextAction(query, uf);
    if (resolved.source !== "unresolved") {
      return { kind: "location", url: locationToResultsUrl(resolved), label: resolved.label };
    }
    return { kind: "not-found", query };
  }

  // 2. Município que já está na nossa base.
  const known = await getKnownMunicipalities(uf);
  const municipality = matchMunicipality(query, known, uf);
  if (municipality) {
    void recordAnalyticsEvent({
      eventType: "location_search",
      metadata: { query, uf, source: municipality.source },
    });
    return { kind: "location", url: locationToResultsUrl(municipality), label: municipality.label };
  }

  // 3. Nome de escola.
  const { schools, totalCount } = await searchSchools({ uf, q: query, sort: "lists" });
  void recordAnalyticsEvent({
    eventType: "school_search",
    metadata: { query, uf, total: totalCount, origin: "home" },
  });

  if (schools.length > 0) {
    return {
      kind: "schools",
      query,
      totalCount,
      allResultsUrl: `/escolas?q=${encodeURIComponent(query)}`,
      schools: schools.slice(0, INLINE_RESULT_LIMIT).map((school) => ({
        id: school.id,
        name: school.name,
        municipality: school.municipality,
        uf: school.uf,
        href: schoolHref(school),
        listCount: school.list_count,
      })),
    };
  }

  // 4. Último recurso: bairro/ponto de referência.
  const place = await searchPlace(`${query}, ${uf}, Brasil`);
  if (place.source !== "unresolved") {
    return { kind: "location", url: locationToResultsUrl(place), label: place.label };
  }

  return { kind: "not-found", query };
}
