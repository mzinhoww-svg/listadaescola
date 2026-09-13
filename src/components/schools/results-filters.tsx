"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Select } from "@/components/ui/select";
import { EDUCATION_LEVELS, type SortMode } from "@/lib/schools/search-schools";
import { buildResultsUrl } from "@/lib/schools/results-url";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "relevance", label: "Relevância" },
  { value: "proximity", label: "Proximidade" },
  { value: "popularity", label: "Popularidade" },
  { value: "rating", label: "Avaliação" },
  { value: "lists", label: "Com lista primeiro" },
];

export interface ResultsFiltersProps {
  /**
   * Total de avaliações moderadas no site inteiro. `null` = não foi
   * possível saber (ver getPublishedReviewCount) -- nesse caso nada é
   * desabilitado, porque desligar controle com base em erro de rede seria
   * pior que deixá-lo funcionar.
   */
  publishedReviewCount?: number | null;
}

/** Filtros (tipo/etapa/avaliação) + ordenação (PRD RF-002/RF-003). Cada mudança navega via URL -- resultado é sempre uma página renderizada no servidor, compartilhável/indexável. */
export function ResultsFilters({ publishedReviewCount = null }: ResultsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    router.push(buildResultsUrl(searchParams, { [key]: value || null }));
  }

  const hasLocation = searchParams.has("lat") || searchParams.has("municipality") || searchParams.has("cep");

  /*
    Onda 9. Em search_schools, `avg_rating` é `coalesce(r.avg_rating, 0)` e
    o filtro é `avg_rating >= p_min_rating`. Com zero avaliações publicadas
    -- que é o estado real hoje --, "4+ estrelas" transforma 2.722 escolas
    reais em zero resultados, e "Ordenar por: Avaliação" ordena 2.722 zeros
    empatados. Nenhum dos dois é um filtro que não achou nada: são
    controles que ainda não têm sobre o que operar.

    Desabilitar dizendo o motivo é a mesma solução que "Proximidade (defina
    uma localização)" logo abaixo, e volta sozinho quando a primeira
    avaliação for aprovada. Deixá-los ligados ensinaria a resposta errada
    -- que nenhuma escola de MT tem nota boa.
  */
  const noReviewsYet = publishedReviewCount === 0;
  const noReviewsSuffix = noReviewsYet ? " (ainda sem avaliações)" : "";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Select
        label="Tipo"
        value={searchParams.get("type") ?? ""}
        onChange={(event) => update("type", event.target.value)}
      >
        <option value="">Todos os tipos</option>
        <option value="PUBLIC">Pública</option>
        <option value="PRIVATE">Privada</option>
      </Select>

      <Select
        label="Etapa"
        value={searchParams.get("level") ?? ""}
        onChange={(event) => update("level", event.target.value)}
      >
        <option value="">Todas as etapas</option>
        {EDUCATION_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </Select>

      {/* O motivo vai na opção, não no rótulo: a 390px um rótulo de duas
          linhas desalinha os selects da mesma linha do grid, e a opção é
          justamente onde a pessoa está no momento de escolher. Mesmo padrão
          de "Proximidade (defina uma localização)" abaixo. */}
      <Select
        label="Avaliação mínima"
        value={searchParams.get("rating") ?? ""}
        onChange={(event) => update("rating", event.target.value)}
      >
        <option value="">Qualquer avaliação</option>
        <option value="4" disabled={noReviewsYet}>
          4+ estrelas{noReviewsSuffix}
        </option>
        <option value="3" disabled={noReviewsYet}>
          3+ estrelas{noReviewsSuffix}
        </option>
      </Select>

      {/* Onda 2 P3: a promessa do produto é "descubra a lista", e até aqui a
          tela de descoberta não sabia dizer quais escolas têm uma. */}
      <Select
        label="Lista de material"
        value={searchParams.get("lista") ?? ""}
        onChange={(event) => update("lista", event.target.value)}
      >
        <option value="">Todas as escolas</option>
        <option value="com">Com lista publicada</option>
        <option value="sem">Ainda sem lista</option>
      </Select>

      <Select
        label="Ordenar por"
        value={searchParams.get("sort") ?? "relevance"}
        onChange={(event) => update("sort", event.target.value)}
      >
        {SORT_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={(option.value === "proximity" && !hasLocation) || (option.value === "rating" && noReviewsYet)}
          >
            {option.label}
            {option.value === "proximity" && !hasLocation ? " (defina uma localização)" : ""}
            {option.value === "rating" ? noReviewsSuffix : ""}
          </option>
        ))}
      </Select>
    </div>
  );
}
