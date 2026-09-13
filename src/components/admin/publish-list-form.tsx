"use client";

import * as React from "react";
import { useActionState } from "react";
import { Search, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  publishListAction,
  searchSchoolsForAdminAction,
  type FormState,
  type SchoolOption,
} from "@/lib/admin/list-actions";
import { parseListItems } from "@/lib/admin/parse-list-items";
import { EDUCATION_LEVELS } from "@/lib/schools/search-schools";
import { toDisplayCase } from "@/lib/utils";

const YEARS = [new Date().getFullYear(), new Date().getFullYear() + 1];

/**
 * Onda 4. O formulário que finalmente deixa o admin publicar uma lista.
 *
 * A peça que decide se isso leva 30 segundos ou 10 minutos é a colagem: o
 * admin recebe a lista como texto (WhatsApp, PDF, foto transcrita) e vê aqui
 * o resultado do parse ANTES de publicar. Nada é gravado sem ele conferir --
 * o parser é conservador de propósito e erra para o lado de deixar ruído no
 * nome em vez de inventar quantidade.
 */
export function PublishListForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(publishListAction, {});

  const [term, setTerm] = React.useState("");
  const [options, setOptions] = React.useState<SchoolOption[]>([]);
  const [school, setSchool] = React.useState<SchoolOption | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [itemsText, setItemsText] = React.useState("");

  // Preview do parse, recalculado a cada tecla. Barato: é string pura.
  const preview = React.useMemo(() => parseListItems(itemsText), [itemsText]);

  async function runSearch() {
    setSearching(true);
    try {
      setOptions(await searchSchoolsForAdminAction(term));
    } finally {
      setSearching(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && (
        <p role="alert" className="rounded-lg border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-lg border border-success-500 bg-success-50 px-4 py-3 text-sm text-success-700">
          {state.success}
        </p>
      )}

      <section>
        <h2 className="mb-2 text-base font-semibold text-neutral-900">1. Escola</h2>
        {school ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-neutral-900">
              <Check className="size-4 shrink-0 text-success-600" aria-hidden="true" />
              <strong className="font-medium">{toDisplayCase(school.name)}</strong>
              <span className="text-neutral-500">
                {school.municipality} - {school.uf}
              </span>
            </span>
            <Button type="button" variant="ghost" onClick={() => setSchool(null)}>
              Trocar
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                label="Buscar escola pelo nome"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    // Enter aqui busca; sem isto ele submeteria o formulário
                    // sem escola escolhida.
                    event.preventDefault();
                    void runSearch();
                  }
                }}
                placeholder="mínimo 3 letras"
                className="min-w-64 flex-1"
              />
              <Button type="button" variant="outline" onClick={runSearch} loading={searching}>
                <Search className="size-4" aria-hidden="true" />
                Buscar
              </Button>
            </div>
            {options.length > 0 && (
              <ul className="mt-3 flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
                {options.map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSchool(option);
                        setOptions([]);
                      }}
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
            {!searching && term.trim().length >= 3 && options.length === 0 && (
              <p className="mt-2 text-sm text-neutral-600">Nenhuma escola ativa com esse nome.</p>
            )}
          </>
        )}
        <input type="hidden" name="school_id" value={school?.id ?? ""} />
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold text-neutral-900">2. Série e ano letivo</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Etapa" name="education_level" defaultValue={EDUCATION_LEVELS[1]} required>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </Select>
          <Input label="Série / ano" name="series_name" placeholder="3º ano" required />
          <Select label="Ano letivo" name="school_year" defaultValue={String(YEARS[1])} required>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </div>
        <p className="mt-2 max-w-[65ch] text-sm text-neutral-600">
          Publicar de novo a mesma combinação não sobrescreve: cria uma versão nova e mantém o
          histórico.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold text-neutral-900">3. Itens</h2>
        <label htmlFor="items_text" className="mb-1.5 block text-sm font-medium text-neutral-700">
          Cole a lista, um item por linha
        </label>
        <textarea
          id="items_text"
          name="items_text"
          value={itemsText}
          onChange={(event) => setItemsText(event.target.value)}
          rows={10}
          required
          placeholder={"2 cadernos brochura 96 folhas\n1 caixa de lápis de cor\n1 tesoura sem ponta (opcional)"}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        />
        <p className="mt-1.5 max-w-[65ch] text-sm text-neutral-600">
          Quantidade no começo da linha e &quot;(opcional)&quot; são reconhecidos automaticamente.
          Confira o resultado abaixo antes de publicar.
        </p>
      </section>

      {preview.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-semibold text-neutral-900">
            Prévia — {preview.length} {preview.length === 1 ? "item" : "itens"}
          </h2>
          <ul className="flex flex-col divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {preview.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="min-w-10 font-medium text-neutral-900">{item.quantity}×</span>
                <span className="flex-1 text-neutral-900">{item.name}</span>
                {item.unit && <span className="text-sm text-neutral-600">{item.unit}</span>}
                {!item.is_required && <Badge variant="info">Opcional</Badge>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <Button type="submit" size="lg" loading={pending} disabled={!school || preview.length === 0}>
          Publicar lista
        </Button>
      </div>
    </form>
  );
}
