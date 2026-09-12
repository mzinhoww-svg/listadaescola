import type { Metadata } from "next";
import Link from "next/link";

import { getAnalyticsEventCounts, getTopSchools, computeApprovalRate, computeListOpenRate } from "@/lib/admin/analytics";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const EVENT_LABEL: Record<string, string> = {
  location_search: "Buscas por localização",
  location_detected: "Localização detectada automaticamente",
  school_search: "Buscas de escola",
  school_impression: "Impressões de escola",
  school_view: "Visualizações de escola",
  list_view: "Aberturas de lista",
  list_share: "Compartilhamentos de lista",
  commerce_click: "Cliques em e-commerce",
  whatsapp_click: "Cliques em WhatsApp",
  store_view: "Visualizações de papelaria",
  favorite_added: "Favoritos adicionados",
  review_created: "Avaliações criadas",
  submission_started: "Envios de lista iniciados",
  submission_submitted: "Envios/sugestões enviados",
  submission_approved: "Envios/sugestões aprovados",
};

const PERIOD_OPTIONS = [7, 30, 90] as const;

interface AnalyticsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminAnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const params = await searchParams;
  const requestedDays = Number(params.days);
  const sinceDays = (PERIOD_OPTIONS as readonly number[]).includes(requestedDays) ? requestedDays : 30;

  const [eventCounts, topSchools] = await Promise.all([getAnalyticsEventCounts(sinceDays), getTopSchools(sinceDays, 10)]);

  const approvalRate = computeApprovalRate(eventCounts.counts);
  const listOpenRate = computeListOpenRate(eventCounts.counts);
  const eventRows = Object.entries(eventCounts.counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Analytics</h1>
          <p className="text-sm text-neutral-500">
            RF-015: agregado server-side a partir de <code>analytics_events</code>, nunca uma tabela exposta direto ao
            navegador. Intenção e conversão -- sem pagamento próprio.
          </p>
        </div>
        <nav aria-label="Período" className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1">
          {PERIOD_OPTIONS.map((days) => (
            <Link
              key={days}
              href={`/admin/analytics?days=${days}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                days === sinceDays ? "bg-primary-600 text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {days} dias
            </Link>
          ))}
        </nav>
      </div>

      <h2 className="sr-only">Métricas do período</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Eventos no período</CardTitle>
            <CardDescription className="text-2xl font-semibold text-neutral-900">{eventCounts.total}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cliques em e-commerce</CardTitle>
            <CardDescription className="text-2xl font-semibold text-neutral-900">
              {eventCounts.counts.commerce_click ?? 0}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cliques em WhatsApp</CardTitle>
            <CardDescription className="text-2xl font-semibold text-neutral-900">
              {eventCounts.counts.whatsapp_click ?? 0}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Listas submetidas</CardTitle>
            <CardDescription className="text-2xl font-semibold text-neutral-900">
              {eventCounts.counts.submission_submitted ?? 0}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Taxa de aprovação de envios</CardTitle>
            <CardDescription className="text-2xl font-semibold text-neutral-900">
              {approvalRate !== null ? formatPercent(approvalRate) : "Sem dados no período"}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Aberturas de lista por visualização de escola</CardTitle>
            <CardDescription className="text-2xl font-semibold text-neutral-900">
              {listOpenRate !== null ? listOpenRate.toFixed(2).replace(".", ",") : "Sem dados no período"}
            </CardDescription>
            {listOpenRate !== null && (
              <p className="text-xs text-neutral-500">
                Não é uma taxa limitada a 100% -- uma lista pode ser aberta por link direto/compartilhado sem
                passar pela página da escola, então o valor pode passar de 1,00.
              </p>
            )}
          </CardHeader>
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-neutral-900">Eventos por tipo</h2>
        {eventRows.length === 0 ? (
          <EmptyState title="Nenhum evento no período" description="Amplie o período ou aguarde tráfego real." />
        ) : (
          <Table>
            <TableCaption>Contagem de eventos, últimos {sinceDays} dias</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Contagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventRows.map(([eventType, count]) => (
                <TableRow key={eventType}>
                  <TableCell className="font-medium text-neutral-900">{EVENT_LABEL[eventType] ?? eventType}</TableCell>
                  <TableCell>{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-neutral-900">Escolas com maior demanda</h2>
        {topSchools.length === 0 ? (
          <EmptyState title="Nenhuma visualização no período" description="Amplie o período ou aguarde tráfego real." />
        ) : (
          <Table>
            <TableCaption>Escolas por visualizações, últimos {sinceDays} dias</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Escola</TableHead>
                <TableHead>Visualizações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSchools.map((school) => (
                <TableRow key={school.schoolId}>
                  <TableCell className="font-medium text-neutral-900">{school.schoolName}</TableCell>
                  <TableCell>{school.viewCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
