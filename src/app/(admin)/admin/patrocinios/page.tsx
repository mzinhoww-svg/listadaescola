import type { Metadata } from "next";

import { getAdminCampaigns } from "@/lib/admin/campaigns";
import { getRankingWeights } from "@/lib/admin/ranking";
import { getAdminStores } from "@/lib/admin/stores";
import { CampaignFormDrawer } from "@/components/admin/campaign-form-drawer";
import { CampaignStatusActions } from "@/components/admin/campaign-status-actions";
import { RankingWeightsForm } from "@/components/admin/ranking-weights-form";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Patrocínios" };

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendada",
  ACTIVE: "Ativa",
  PAUSED: "Pausada",
  ENDED: "Encerrada",
};

const STATUS_BADGE: Record<string, BadgeProps["variant"]> = {
  SCHEDULED: "info",
  ACTIVE: "sponsored",
  PAUSED: "warning",
  ENDED: "neutral",
};

export default async function AdminPatrociniosPage() {
  const [campaigns, weights, stores] = await Promise.all([getAdminCampaigns(), getRankingWeights(), getAdminStores()]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Patrocínios</h1>
        <p className="text-sm text-neutral-500">
          Campanha, entidade, período e prioridade (RF-003, RN-008). Patrocínio nunca altera a nota orgânica ou a
          avaliação exibida -- só a posição, sempre sinalizado como &ldquo;PATROCINADA&rdquo;.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-neutral-900">Campanhas</h2>
          <CampaignFormDrawer stores={stores} />
        </div>
        {campaigns.length === 0 ? (
          <EmptyState title="Nenhuma campanha cadastrada" description="Crie a primeira acima." />
        ) : (
          <Table>
            <TableCaption>Campanhas de patrocínio</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Entidade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium text-neutral-900">{campaign.entityName}</TableCell>
                  <TableCell>{campaign.entityType === "SCHOOL" ? "Escola" : "Papelaria"}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(campaign.startsAt).toLocaleDateString("pt-BR")} –{" "}
                    {new Date(campaign.endsAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>{campaign.priority}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[campaign.status]}>{STATUS_LABEL[campaign.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <CampaignStatusActions campaignId={campaign.id} status={campaign.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Pesos do ranking orgânico</CardTitle>
            <CardDescription>
              Configurável só aqui, no backend -- nunca no código do cliente (RF-003). Última alteração:{" "}
              {new Date(weights.updatedAt).toLocaleString("pt-BR")}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RankingWeightsForm weights={weights} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
