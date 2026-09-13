import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buildResultsUrl } from "@/lib/schools/results-url";

export interface PaginationControlsProps {
  page: number;
  pageCount: number;
  searchParams: URLSearchParams;
  basePath?: string;
}

/** Acima disto a régua não cabe em 390px sem virar alvo pequeno demais. */
const FULL_RULER_MAX = 7;

/**
 * Onda 10 -- a paginação passa a ter números, não só "anterior/próxima".
 *
 * Motivo de rastreabilidade, não só de conforto: com apenas
 * anterior/próxima, as páginas de uma cidade formavam uma CORRENTE, e a
 * única forma de um rastreador (ou de uma pessoa) chegar à página 5 era
 * clicar quatro vezes.
 *
 * Medido em MT: das 141 cidades, 105 cabem numa página só e 36 têm mais de
 * uma, com média de 3,1 páginas. Ou seja, `FULL_RULER_MAX = 7` já mostra
 * TODAS as páginas de 33 dessas 36 cidades -- a corrente deixa de existir
 * para praticamente todo o catálogo.
 *
 * Sobram três cidades grandes (Cuiabá 20 páginas, Várzea Grande 9,
 * Rondonópolis 8) e a listagem de `/escolas/mt` (137). Para essas, a janela
 * curta (primeira, última e vizinhas da atual) NÃO reduz a distância até o
 * meio da sequência, e não adianta fingir que reduz: quem cobre essas
 * escolas é o sitemap, que lista as 2.722 URLs diretamente, mais os links
 * laterais "Outras escolas em <cidade>" que cada perfil de escola passou a
 * ter.
 */
function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= FULL_RULER_MAX) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const visible = [...pages].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);

  const withGaps: (number | "gap")[] = [];
  let previous = 0;
  for (const n of visible) {
    if (previous && n - previous > 1) withGaps.push("gap");
    withGaps.push(n);
    previous = n;
  }
  return withGaps;
}

export function PaginationControls({ page, pageCount, searchParams, basePath }: PaginationControlsProps) {
  if (pageCount <= 1) return null;

  const linkClasses =
    "flex h-11 items-center gap-1 rounded-lg border border-neutral-300 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50 aria-disabled:pointer-events-none aria-disabled:opacity-40";

  // Página 1 sem `?page=1`: é a mesma página do endereço limpo, e duas URLs
  // para o mesmo conteúdo é exatamente o que o canonical desta rota existe
  // para evitar.
  const hrefFor = (target: number) =>
    buildResultsUrl(searchParams, { page: target > 1 ? String(target) : null }, basePath);

  return (
    <nav aria-label="Paginação de resultados" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Link href={hrefFor(Math.max(1, page - 1))} aria-disabled={page <= 1} className={cn(linkClasses)}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          Anterior
        </Link>
        <span className="text-sm text-neutral-500">
          Página {page} de {pageCount}
        </span>
        <Link
          href={hrefFor(Math.min(pageCount, page + 1))}
          aria-disabled={page >= pageCount}
          className={cn(linkClasses)}
        >
          Próxima
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <ol className="flex flex-wrap items-center justify-center gap-1.5">
        {pageWindow(page, pageCount).map((entry, index) =>
          entry === "gap" ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-sm text-neutral-400">
              …
            </li>
          ) : (
            <li key={entry}>
              <Link
                href={hrefFor(entry)}
                aria-label={`Página ${entry}`}
                aria-current={entry === page ? "page" : undefined}
                className={cn(
                  "flex h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm font-medium",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
                  entry === page
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                )}
              >
                {entry}
              </Link>
            </li>
          )
        )}
      </ol>
    </nav>
  );
}
