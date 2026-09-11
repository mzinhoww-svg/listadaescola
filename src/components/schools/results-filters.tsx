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
];

/** Filtros (tipo/etapa/avaliação) + ordenação (PRD RF-002/RF-003). Cada mudança navega via URL -- resultado é sempre uma página renderizada no servidor, compartilhável/indexável. */
export function ResultsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    router.push(buildResultsUrl(searchParams, { [key]: value || null }));
  }

  const hasLocation = searchParams.has("lat") || searchParams.has("municipality") || searchParams.has("cep");

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      <Select
        label="Avaliação mínima"
        value={searchParams.get("rating") ?? ""}
        onChange={(event) => update("rating", event.target.value)}
      >
        <option value="">Qualquer avaliação</option>
        <option value="4">4+ estrelas</option>
        <option value="3">3+ estrelas</option>
      </Select>

      <Select
        label="Ordenar por"
        value={searchParams.get("sort") ?? "relevance"}
        onChange={(event) => update("sort", event.target.value)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} disabled={option.value === "proximity" && !hasLocation}>
            {option.label}
            {option.value === "proximity" && !hasLocation ? " (defina uma localização)" : ""}
          </option>
        ))}
      </Select>
    </div>
  );
}
