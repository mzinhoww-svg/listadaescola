import type { Metadata } from "next";
import Link from "next/link";

import {
  getModerationQueue,
  QUEUE_DEFAULT_STATUSES,
  QUEUE_FILTERABLE_STATUSES,
  type ModerationStatus,
} from "@/lib/moderation/queue";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Moderação" };

const STATUS_LABEL: Record<ModerationStatus, string> = {
  DRAFT: "Rascunho",
  SUBMITTED: "Enviada",
  UNDER_REVIEW: "Em revisão",
  NEEDS_CORRECTION: "Precisa de correção",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  ARCHIVED: "Arquivada",
};

const STATUS_BADGE: Record<ModerationStatus, BadgeProps["variant"]> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  UNDER_REVIEW: "warning",
  NEEDS_CORRECTION: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  ARCHIVED: "neutral",
};

function daysAgo(isoDate: string): string {
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

export default async function ModerationQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const activeStatus =
    statusParam && (QUEUE_FILTERABLE_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as ModerationStatus)
      : null;

  const statuses = activeStatus ? [activeStatus] : QUEUE_DEFAULT_STATUSES;
  const queue = await getModerationQueue(statuses);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-neutral-900">Moderação</h1>
          <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
            <Link href="/admin/moderacao/sugestoes" className="text-sm font-medium text-primary-700 hover:underline">
              Sugestões de escola →
            </Link>
            <Link href="/admin/moderacao/avaliacoes" className="text-sm font-medium text-primary-700 hover:underline">
              Avaliações →
            </Link>
          </div>
        </div>
        <p className="text-sm text-neutral-500">
          Fila ordenada pelas mais antigas primeiro -- é a submissão esperando há mais tempo, não a &ldquo;mais urgente&rdquo;.
        </p>
      </div>

      <nav aria-label="Filtrar por status" className="flex flex-wrap gap-2">
        <Link
          href="/admin/moderacao"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium",
            !activeStatus ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          )}
        >
          Fila (pendentes)
        </Link>
        {QUEUE_FILTERABLE_STATUSES.filter((s) => !QUEUE_DEFAULT_STATUSES.includes(s)).map((status) => (
          <Link
            key={status}
            href={`/admin/moderacao?status=${status}`}
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
        <EmptyState title="Nada por aqui" description="Nenhuma submissão neste filtro." />
      ) : (
        <Table>
          <TableCaption>Fila de moderação de listas escolares</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Escola</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Série/Ano</TableHead>
              <TableHead>Enviado por</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Badge variant={STATUS_BADGE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/admin/moderacao/${item.id}`} className="font-medium text-primary-700 hover:underline">
                    {item.school.name}
                  </Link>
                </TableCell>
                <TableCell>{item.school.municipality}</TableCell>
                <TableCell>
                  {item.seriesName} · {item.schoolYear}
                </TableCell>
                <TableCell>{item.submittedBy.fullName ?? "—"}</TableCell>
                <TableCell>{daysAgo(item.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
