import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getManagedStore, getStoreQuoteRequests, summarizeQuoteRequests } from "@/lib/stores/manager";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pedidos de orçamento",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function PedidosPage() {
  const store = await getManagedStore();
  if (!store) notFound();

  const requests = await getStoreQuoteRequests(store.id);
  const summary = summarizeQuoteRequests(requests);

  const cards = [
    { label: "Últimos 7 dias", value: summary.last7Days },
    { label: "Últimos 30 dias", value: summary.last30Days },
    { label: "Total", value: summary.total },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/minha-papelaria"
          className="mb-2 flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Minha papelaria
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900">Pedidos de orçamento</h1>
        <p className="text-sm text-neutral-500">
          Cada linha é uma família que abriu o WhatsApp da sua loja a partir de uma lista escolar. A conversa em
          si acontece no seu WhatsApp — aqui não guardamos nenhum dado de quem clicou.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle className="text-2xl">{card.value}</CardTitle>
              <CardDescription>{card.label}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {requests.length === 0 ? (
        <EmptyState
          title="Nenhum pedido ainda"
          description="Assim que alguém pedir orçamento pela sua página ou por uma lista escolar perto de você, aparece aqui."
        />
      ) : (
        <Table>
          <TableCaption>Pedidos de orçamento recebidos pelo Listada Escola</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Escola</TableHead>
              <TableHead>Lista</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="whitespace-nowrap">{dateTimeFormatter.format(new Date(request.createdAt))}</TableCell>
                <TableCell>
                  {request.school ? (
                    <>
                      <span className="font-medium text-neutral-900">{request.school.name}</span>
                      <span className="block text-xs text-neutral-500">{request.school.municipality}</span>
                    </>
                  ) : (
                    <span className="text-neutral-500">Direto da sua página</span>
                  )}
                </TableCell>
                <TableCell>
                  {request.list ? (
                    <Link href={`/listas/${request.list.slug}`} className="text-primary-700 hover:underline">
                      {request.list.seriesName} · {request.list.schoolYear}
                    </Link>
                  ) : (
                    <span className="text-neutral-500">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
