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

export function PaginationControls({ page, pageCount, searchParams, basePath }: PaginationControlsProps) {
  if (pageCount <= 1) return null;

  const linkClasses =
    "flex h-11 items-center gap-1 rounded-lg border border-neutral-300 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50 aria-disabled:pointer-events-none aria-disabled:opacity-40";

  return (
    <nav aria-label="Paginação de resultados" className="flex items-center justify-between gap-3">
      <Link
        href={buildResultsUrl(searchParams, { page: page > 1 ? String(page - 1) : null }, basePath)}
        aria-disabled={page <= 1}
        className={cn(linkClasses)}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Anterior
      </Link>
      <span className="text-sm text-neutral-500">
        Página {page} de {pageCount}
      </span>
      <Link
        href={buildResultsUrl(searchParams, { page: String(Math.min(pageCount, page + 1)) }, basePath)}
        aria-disabled={page >= pageCount}
        className={cn(linkClasses)}
      >
        Próxima
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </nav>
  );
}
