import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import {
  getStoreClaimQueue,
  STORE_CLAIM_DEFAULT_STATUSES,
  STORE_CLAIM_FILTERABLE_STATUSES,
  type StoreClaimStatus,
} from "@/lib/admin/store-claims";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Solicitações de papelaria" };

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Enviada",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
};

const STATUS_BADGE: Record<string, BadgeProps["variant"]> = {
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "danger",
};

export default async function StoreClaimQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const activeStatus =
    statusParam && (STORE_CLAIM_FILTERABLE_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as StoreClaimStatus)
      : null;

  const statuses = activeStatus ? [activeStatus] : STORE_CLAIM_DEFAULT_STATUSES;
  const queue = await getStoreClaimQueue(statuses);

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
        <h1 className="text-2xl font-semibold text-neutral-900">Solicitações de papelaria</h1>
        <p className="text-sm text-neutral-500">
          Autocadastro e reivindicação na mesma fila. Aprovar publica a papelaria (ou entrega a existente ao
          solicitante) e dá acesso à área do gestor -- nada disso acontece antes.
        </p>
      </div>

      <nav aria-label="Filtrar por status" className="flex flex-wrap gap-2">
        <Link
          href="/admin/moderacao/papelarias"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium",
            !activeStatus ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          )}
        >
          Pendentes
        </Link>
        {STORE_CLAIM_FILTERABLE_STATUSES.filter((status) => !STORE_CLAIM_DEFAULT_STATUSES.includes(status)).map(
          (status) => (
            <Link
              key={status}
              href={`/admin/moderacao/papelarias?status=${status}`}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                activeStatus === status ? "bg-primary-600 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              )}
            >
              {STATUS_LABEL[status]}
            </Link>
          )
        )}
      </nav>

      {queue.length === 0 ? (
        <EmptyState title="Nada por aqui" description="Nenhuma solicitação neste filtro." />
      ) : (
        <Table>
          <TableCaption>Fila de solicitações de papelaria</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Papelaria</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Solicitado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Badge variant={STATUS_BADGE[item.status]}>{STATUS_LABEL[item.status] ?? item.status}</Badge>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/moderacao/papelarias/${item.id}`}
                    className="font-medium text-primary-700 hover:underline"
                  >
                    {item.storeName}
                  </Link>
                </TableCell>
                <TableCell>
                  {item.municipality}/{item.uf}
                </TableCell>
                <TableCell>
                  <Badge variant={item.isExistingStore ? "warning" : "neutral"}>
                    {item.isExistingStore ? "Reivindicação" : "Cadastro novo"}
                  </Badge>
                </TableCell>
                <TableCell>{item.requestedBy.fullName ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
