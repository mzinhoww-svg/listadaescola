import type { Metadata } from "next";

import {
  getStoreOptions,
  getPartnerOptions,
  getStoreSaleReports,
  getPartnerSaleReports,
  summarizeStoreSaleReports,
  summarizePartnerSaleReports,
} from "@/lib/admin/sales";
import { StoreSaleReportFormDrawer } from "@/components/admin/store-sale-report-form-drawer";
import { PartnerSaleReportFormDrawer } from "@/components/admin/partner-sale-report-form-drawer";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Vendas" };

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Solicitado",
  QUOTED: "Orçamento enviado",
  CONVERTED: "Convertido",
  LOST: "Perdido",
};

const STATUS_BADGE: Record<string, BadgeProps["variant"]> = {
  REQUESTED: "info",
  QUOTED: "warning",
  CONVERTED: "success",
  LOST: "danger",
};

export default async function AdminVendasPage() {
  const [stores, partners, storeReports, partnerReports] = await Promise.all([
    getStoreOptions(),
    getPartnerOptions(),
    getStoreSaleReports(),
    getPartnerSaleReports(),
  ]);

  const storeSummary = summarizeStoreSaleReports(storeReports);
  const partnerSummary = summarizePartnerSaleReports(partnerReports);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Vendas</h1>
        <p className="text-sm text-neutral-500">
          Registros autorreportados de venda e comissão (RF-015) -- sem checkout, sem gateway de pagamento. Um admin
          registra aqui o que o parceiro ou a papelaria informou por fora (WhatsApp, e-mail, telefone).
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Papelarias</h2>
            <p className="text-sm text-neutral-500">
              {storeSummary.totalReports} registro(s) · {storeSummary.converted} convertido(s)
              {storeSummary.conversionRate !== null && ` · conversão ${formatPercent(storeSummary.conversionRate)}`}
              {storeSummary.averageTicket !== null && ` · ticket médio ${formatCurrency(storeSummary.averageTicket)}`}
            </p>
          </div>
          <StoreSaleReportFormDrawer stores={stores} />
        </div>
        {storeReports.length === 0 ? (
          <EmptyState title="Nenhum registro ainda" description="Registre a primeira solicitação de orçamento acima." />
        ) : (
          <Table>
            <TableCaption>Vendas reportadas por papelaria</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Papelaria</TableHead>
                <TableHead>Escola</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Orçamento</TableHead>
                <TableHead>Venda</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storeReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium text-neutral-900">{report.storeName}</TableCell>
                  <TableCell className="text-sm text-neutral-500">{report.schoolName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[report.status]}>{STATUS_LABEL[report.status]}</Badge>
                  </TableCell>
                  <TableCell>{report.quotedValue !== null ? formatCurrency(report.quotedValue) : "—"}</TableCell>
                  <TableCell>{report.saleValue !== null ? formatCurrency(report.saleValue) : "—"}</TableCell>
                  <TableCell>
                    <StoreSaleReportFormDrawer stores={stores} report={report} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">E-commerce</h2>
            <p className="text-sm text-neutral-500">
              {partnerSummary.totalReports} conversão(ões) reportada(s) · {formatCurrency(partnerSummary.totalGrossValue)} em
              valor bruto · {formatCurrency(partnerSummary.totalCommission)} em comissão
            </p>
          </div>
          <PartnerSaleReportFormDrawer partners={partners} />
        </div>
        {partnerReports.length === 0 ? (
          <EmptyState title="Nenhuma conversão reportada ainda" description="Registre a primeira acima." />
        ) : (
          <Table>
            <TableCaption>Conversões reportadas por parceiro de e-commerce</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Parceiro</TableHead>
                <TableHead>Escola</TableHead>
                <TableHead>Valor bruto</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium text-neutral-900">{report.partnerName}</TableCell>
                  <TableCell className="text-sm text-neutral-500">{report.schoolName ?? "—"}</TableCell>
                  <TableCell>{formatCurrency(report.grossValue)}</TableCell>
                  <TableCell>{formatCurrency(report.commissionValue)}</TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {new Date(report.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <PartnerSaleReportFormDrawer partners={partners} report={report} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {(stores.length === 0 || partners.length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Nada para registrar ainda</CardTitle>
            <CardDescription>
              {stores.length === 0 && partners.length === 0
                ? "Cadastre ao menos uma papelaria (Admin > Papelarias) ou um parceiro de e-commerce (Admin > Parceiros) antes de registrar vendas."
                : stores.length === 0
                  ? "Cadastre ao menos uma papelaria em Admin > Papelarias para registrar vendas de papelaria."
                  : "Cadastre ao menos um parceiro em Admin > Parceiros para registrar conversões de e-commerce."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
