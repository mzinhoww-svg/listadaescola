"use client";

import Link from "next/link";
import { ArrowRight, ListChecks, MapPin, SearchX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toDisplayCase } from "@/lib/utils";
import type { HomeSearchResult, HomeSearchSchool } from "@/lib/schools/home-search";
import { ListNotificationForm } from "./list-notification-form";

/**
 * Onda 3 -- o resultado da busca por nome aparece na própria home.
 *
 * Antes o nome da escola era despachado direto para /escolas?q=..., e é lá
 * que a jornada morria: a pessoa via "Ainda sem lista" numa página de
 * catálogo e não tinha o que fazer com isso. Como hoje esse é o desfecho
 * de praticamente toda busca (2.722 escolas, nenhuma lista real
 * publicada), o desfecho precisa ser respondido onde a pergunta foi feita
 * -- com uma saída, não com um beco.
 *
 * O escopo é deliberadamente pequeno: no máximo 6 escolas, sem filtro, sem
 * paginação, sem mapa. Não é uma segunda página de resultados; é a
 * confirmação de qual escola é a sua, e o que fazer a seguir. Quem
 * realmente quer explorar tem "ver todas" logo abaixo, que leva ao
 * catálogo de verdade.
 */
function SchoolRow({ school }: { school: HomeSearchSchool }) {
  const hasList = school.listCount > 0;

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-paper p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-neutral-900">
            <Link
              href={school.href}
              className="rounded-lg hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              {toDisplayCase(school.name)}
            </Link>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            {school.municipality} - {school.uf}
          </p>
        </div>
        {hasList ? (
          <Badge variant="success">
            <ListChecks className="size-3" aria-hidden="true" />
            {school.listCount} {school.listCount === 1 ? "lista" : "listas"}
          </Badge>
        ) : (
          <Badge variant="neutral">Ainda sem lista</Badge>
        )}
      </div>

      {hasList ? (
        <Button asChild className="w-full sm:w-auto">
          <Link href={school.href}>
            {school.listCount === 1 ? "Ver a lista" : "Ver as listas"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <ListNotificationForm schoolId={school.id} schoolName={toDisplayCase(school.name)} />
          {/* A outra intenção possível de quem chegou aqui: a lista está na
              mão dela, em papel. /enviar-lista já aceita a escola por id. */}
          <Link
            href={`/enviar-lista?escola=${school.id}`}
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary-700 underline underline-offset-2 hover:text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            Eu tenho essa lista — quero enviar
          </Link>
        </div>
      )}
    </li>
  );
}

export function HomeSearchResults({ result }: { result: HomeSearchResult }) {
  if (result.kind === "not-found") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-neutral-300 p-5">
        <p className="flex items-start gap-2 font-medium text-neutral-900">
          <SearchX className="mt-0.5 size-5 shrink-0 text-neutral-400" aria-hidden="true" />
          Não encontramos nada para “{result.query}”.
        </p>
        <p className="max-w-[65ch] text-sm text-neutral-600">
          Tente o CEP da sua casa, o nome da cidade ou parte do nome da escola. Se a escola não estiver na nossa base,
          você pode nos avisar.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/escolas">Ver escolas de MT</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/sugerir-escola">Sugerir uma escola</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (result.kind !== "schools") return null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-neutral-600">
        {result.totalCount === 1
          ? "1 escola encontrada"
          : `${result.totalCount} escolas encontradas`}{" "}
        para “{result.query}”.
      </p>
      <ul className="flex flex-col gap-3">
        {result.schools.map((school) => (
          <SchoolRow key={school.id} school={school} />
        ))}
      </ul>
      {result.totalCount > result.schools.length && (
        <Link
          href={result.allResultsUrl}
          className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-primary-700 underline underline-offset-2 hover:text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          Ver todas as {result.totalCount} escolas
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
