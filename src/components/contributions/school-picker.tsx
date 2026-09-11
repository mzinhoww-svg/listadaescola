"use client";

import * as React from "react";
import Link from "next/link";
import { Search, MapPin } from "lucide-react";

import { searchSchoolsForWizardAction, type SchoolSearchOption } from "@/lib/contributions/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

export function SchoolPicker({ onSelect }: { onSelect: (school: SchoolSearchOption) => void }) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SchoolSearchOption[] | null>(null);
  const [pending, startTransition] = React.useTransition();

  function runSearch() {
    const trimmed = query.trim();
    if (trimmed.length < 3) return;
    startTransition(async () => {
      const found = await searchSchoolsForWizardAction(trimmed);
      setResults(found);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Deliberately a <div>, not a <form> -- SchoolPicker can end up
       * composed inside a caller's own <form> (e.g. the admin sales-report
       * Drawers, Prompt 14). Nested <form> elements are invalid HTML; when
       * built anyway via React (DOM APIs allow what the parser wouldn't),
       * clicking a nested type="submit" button triggered a genuine native
       * form submission (a real GET navigation to the current URL) instead
       * of respecting either form's onSubmit/preventDefault -- confirmed
       * live via Playwright request/navigation tracing, not just a
       * suspicion. A plain button + explicit search trigger has no
       * "submit" semantics at all, so there is no submission to nest. */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Nome da escola ou código INEP"
            placeholder="Ex.: Colégio Coração de Jesus"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                runSearch();
              }
            }}
            autoComplete="off"
            helperText="Digite ao menos 3 letras"
          />
        </div>
        <Button type="button" onClick={runSearch} disabled={query.trim().length < 3}>
          <Search className="size-4" aria-hidden="true" />
          Buscar
        </Button>
      </div>

      {/* Dedicated, visually-hidden announcer -- a screen-reader user who
       * clicks "Buscar" otherwise gets no indication results appeared,
       * since nothing here moves focus and the visible list/EmptyState
       * below isn't itself a live region. */}
      <div role="status" aria-live="polite" className="sr-only">
        {pending && "Buscando escolas..."}
        {!pending && results && results.length === 0 && "Nenhuma escola encontrada."}
        {!pending && results && results.length > 0 && `${results.length} escola(s) encontrada(s).`}
      </div>

      {pending && <LoadingState label="Buscando escolas..." />}

      {!pending && results && results.length === 0 && (
        <EmptyState
          icon={MapPin}
          title="Nenhuma escola encontrada"
          description="Confira o nome digitado ou sugira uma nova escola."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/sugerir-escola">Sugerir nova escola</Link>
            </Button>
          }
        />
      )}

      {!pending && results && results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((school) => (
            <li key={school.id}>
              <button
                type="button"
                onClick={() => onSelect(school)}
                className="flex w-full flex-col items-start gap-0.5 rounded-lg border border-neutral-200 bg-white p-3 text-left hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                <span className="text-sm font-semibold text-neutral-900">{school.name}</span>
                <span className="text-xs text-neutral-500">
                  {school.municipality} · INEP {school.inepCode}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!pending && !results && (
        <p className="text-sm text-neutral-500">
          Não encontrou sua escola depois de buscar?{" "}
          <Link href="/sugerir-escola" className="font-medium text-primary-600 hover:underline">
            Sugerir nova escola
          </Link>
        </p>
      )}
    </div>
  );
}
