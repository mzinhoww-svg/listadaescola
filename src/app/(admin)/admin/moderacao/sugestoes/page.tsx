import type { Metadata } from "next";
import Link from "next/link";

import {
  getSchoolSuggestionQueue,
  SUGGESTION_QUEUE_DEFAULT_STATUSES,
  SUGGESTION_QUEUE_FILTERABLE_STATUSES,
  type SuggestionStatus,
} from "@/lib/admin/school-suggestions";
import { ChevronLeft } from "lucide-react";

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Sugestões de escola" };

const STATUS_LABEL: Record<SuggestionStatus, string> = {
  DRAFT: "Rascunho",
  SUBMITTED: "Enviada",
  UNDER_REVIEW: "Em revisão",
  NEEDS_CORRECTION: "Precisa de correção",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  ARCHIVED: "Arquivada",
};

const STATUS_BADGE: Record<SuggestionStatus, BadgeProps["variant"]> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  UNDER_REVIEW: "warning",
  NEEDS_CORRECTION: "danger",
  APPROVED: "success",
  REJECTED: "danger",
  ARCHIVED: "neutral",
};

export default async function SchoolSuggestionQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const activeStatus =
    statusParam && (SUGGESTION_QUEUE_FILTERABLE_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as SuggestionStatus)
      : null;

  const statuses = activeStatus ? [activeStatus] : SUGGESTION_QUEUE_DEFAULT_STATUSES;
  const queue = await getSchoolSuggestionQueue(statuses);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/moderacao"
          className="mb-2 flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Fila de listas
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900">Sugestões de escola</h1>
        <p className="text-sm text-neutral-500">
          Aprovar aqui só marca a sugestão como revisada -- criar a escola de verdade (com código INEP) continua manual
          (PRD RF-008: sugestão nunca cria registro oficial diretamente).
        </p>
      </div>

      <nav aria-label="Filtrar por status" className="flex flex-wrap gap-2">
        <Link
          href="/admin/moderacao/sugestoes"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium",
            !activeStatus ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          )}
        >
          Pendentes
        </Link>
        {SUGGESTION_QUEUE_FILTERABLE_STATUSES.filter((s) => !SUGGESTION_QUEUE_DEFAULT_STATUSES.includes(s)).map((status) => (
          <Link
            key={status}
            href={`/admin/moderacao/sugestoes?status=${status}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              activeStatus === status ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            )}
          >
            {STATUS_LABEL[status]}
          </Link>
        ))}
      </nav>

      {queue.length === 0 ? (
        <EmptyState title="Nada por aqui" description="Nenhuma sugestão neste filtro." />
      ) : (
        <Table>
          <TableCaption>Fila de sugestões de escola</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Nome sugerido</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Sugerido por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Badge variant={STATUS_BADGE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/admin/moderacao/sugestoes/${item.id}`} className="font-medium text-primary-700 hover:underline">
                    {item.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {item.municipality}/{item.uf}
                </TableCell>
                <TableCell>{item.suggestedBy.fullName ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
