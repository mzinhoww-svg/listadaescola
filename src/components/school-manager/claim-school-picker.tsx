"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { searchSchoolsForClaimAction, type ClaimSchoolOption } from "@/lib/schools/claim-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toDisplayCase } from "@/lib/utils";

/**
 * Onda 7. Só aparece para quem chega em `/reivindicar-escola` sem
 * `?escola=` -- ou seja, pelo caminho institucional (`/para-escolas`).
 * Quem vem do perfil da escola já traz o id e nunca vê esta tela.
 *
 * Escolher a escola muda a URL (`?escola=<id>`) em vez de guardar estado
 * local: assim o formulário seguinte continua sendo renderizado no
 * servidor com a escola já resolvida, e o link é compartilhável.
 */
export function ClaimSchoolPicker() {
  const router = useRouter();
  const [term, setTerm] = React.useState("");
  const [options, setOptions] = React.useState<ClaimSchoolOption[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searched, setSearched] = React.useState(false);

  async function runSearch() {
    setSearching(true);
    try {
      setOptions(await searchSchoolsForClaimAction(term));
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <Input
          label="Nome da escola"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void runSearch();
            }
          }}
          placeholder="mínimo 3 letras"
          className="min-w-56"
          // O wrapper do Input é flex-col; o crescimento tem que vir de
          // fora dele, não da classe do <input>.
        />
        <Button type="button" variant="outline" onClick={runSearch} loading={searching}>
          <Search className="size-4" aria-hidden="true" />
          Buscar
        </Button>
      </div>

      {options.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => router.push(`/reivindicar-escola?escola=${option.id}`)}
                className="flex min-h-11 w-full flex-col items-start px-4 py-2.5 text-left hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                <span className="font-medium text-neutral-900">{toDisplayCase(option.name)}</span>
                <span className="text-sm text-neutral-500">
                  {option.municipality} - {option.uf}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {searched && !searching && options.length === 0 && (
        <p className="text-sm text-neutral-600">
          Nenhuma escola ativa com esse nome. Se ela não estiver na base do INEP, use o formulário de{" "}
          <a href="/sugerir-escola" className="font-medium text-primary-700 hover:underline">
            sugerir escola
          </a>
          .
        </p>
      )}
    </div>
  );
}
