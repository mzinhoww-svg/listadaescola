import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import {
  getSchoolClaimQueue,
  CLAIM_QUEUE_DEFAULT_STATUSES,
  CLAIM_QUEUE_FILTERABLE_STATUSES,
  type SchoolClaimStatus,
} from "@/lib/admin/school-claims";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, toDisplayCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Reivindicações de escola" };

const STATUS_LABEL: Partial<Record<SchoolClaimStatus, string>> = {
  SUBMITTED: "Em análise",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
};

const STATUS_BADGE: Partial<Record<SchoolClaimStatus, BadgeProps["variant"]>> = {
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "danger",
};

function daysAgo(isoDate: string): string {
  const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

export default async function SchoolClaimQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const activeStatus =
    statusParam && (CLAIM_QUEUE_FILTERABLE_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as SchoolClaimStatus)
      : null;

  const statuses = activeStatus ? [activeStatus] : CLAIM_QUEUE_DEFAULT_STATUSES;
  const queue = await getSchoolClaimQueue(statuses);

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
        <h1 className="text-2xl font-semibold text-neutral-900">Reivindicações de escola</h1>
        <p className="max-w-[75ch] text-sm text-neutral-500">
          Aprovar aqui dá à pessoa poder editorial sobre a escola e o direito de publicar listas dela sem
          moderação. Não existe verificação automática de vínculo (ver{" "}
          <code className="rounded bg-neutral-100 px-1">docs/product/school-claim.md</code>): a conferência é
          sua, comparando a declaração com os dados oficiais do INEP.
        </p>
      </div>

      <nav aria-label="Filtrar por status" className="flex flex-wrap gap-2">
        <Link
          href="/admin/moderacao/reivindicacoes"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium",
            !activeStatus ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          )}
        >
          Pendentes
        </Link>
        {CLAIM_QUEUE_FILTERABLE_STATUSES.filter((status) => !CLAIM_QUEUE_DEFAULT_STATUSES.includes(status)).map(
          (status) => (
            <Link
              key={status}
              href={`/admin/moderacao/reivindicacoes?status=${status}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                activeStatus === status
                  ? "bg-primary-600 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              )}
            >
              {STATUS_LABEL[status] ?? status}
            </Link>
          )
        )}
      </nav>

      {queue.length === 0 ? (
        <EmptyState title="Nada por aqui" description="Nenhuma reivindicação neste filtro." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>Fila de reivindicações, mais antigas primeiro</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Escola</TableHead>
                <TableHead>Quem pediu</TableHead>
                <TableHead>Esperando</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[item.status] ?? "neutral"}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/moderacao/reivindicacoes/${item.id}`}
                      className="font-medium text-primary-700 hover:underline"
                    >
                      {toDisplayCase(item.school.name)}
                    </Link>
                    <span className="block text-sm text-neutral-500">
                      {item.school.municipality}/{item.school.uf}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.claimantName}
                    <span className="block text-sm text-neutral-500">{item.claimantRole}</span>
                  </TableCell>
                  <TableCell>{daysAgo(item.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
