import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { getAdminStores } from "@/lib/admin/stores";
import { getAdminCampaigns, type AdminCampaign } from "@/lib/admin/campaigns";
import { normalizeWhatsappNumber } from "@/lib/stores/whatsapp";
import { StoreFormDrawer } from "@/components/admin/store-form-drawer";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Papelarias" };

// Same live-window definition is_entity_sponsored() uses for the public
// pages -- campaign.status is an admin-set field, not itself proof the
// sponsorship window is current.
function isLiveSponsorship(campaign: AdminCampaign): boolean {
  const now = Date.now();
  return campaign.status === "ACTIVE" && new Date(campaign.startsAt).getTime() <= now && new Date(campaign.endsAt).getTime() >= now;
}

export default async function AdminStoresPage() {
  const [stores, campaigns] = await Promise.all([getAdminStores(), getAdminCampaigns()]);

  const sponsoredStoreIds = new Set(
    campaigns.filter((campaign) => campaign.entityType === "STORE" && isLiveSponsorship(campaign)).map((campaign) => campaign.entityId)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Papelarias</h1>
          <p className="text-sm text-neutral-500">Sem submissão de parceiro -- toda papelaria é criada pelo admin.</p>
        </div>
        <StoreFormDrawer />
      </div>

      {stores.length === 0 ? (
        <EmptyState title="Nenhuma papelaria cadastrada" description="Crie a primeira acima." />
      ) : (
        <Table>
          <TableCaption>Papelarias parceiras</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Entrega/Retirada</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.map((store) => {
              const whatsappValid = normalizeWhatsappNumber(store.whatsapp) !== null;
              return (
                <TableRow key={store.id}>
                  <TableCell className="font-medium text-neutral-900">{store.name}</TableCell>
                  <TableCell>
                    {store.municipality}/{store.uf}
                  </TableCell>
                  <TableCell>
                    <span className={whatsappValid ? undefined : "text-danger-600"}>{store.whatsapp}</span>
                    {!whatsappValid && (
                      <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-danger-600" title="Número inválido -- o botão de WhatsApp não aparece para o público">
                        <AlertTriangle className="size-3.5" aria-hidden="true" />
                        inválido
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {store.offers_delivery && <Badge variant="info">Entrega</Badge>}{" "}
                    {store.offers_pickup && <Badge variant="info">Retirada</Badge>}
                  </TableCell>
                  <TableCell className="flex flex-wrap gap-1.5">
                    <Badge variant={store.is_active ? "success" : "neutral"}>{store.is_active ? "Ativa" : "Inativa"}</Badge>
                    {sponsoredStoreIds.has(store.id) && <Badge variant="sponsored">Patrocinada</Badge>}
                  </TableCell>
                  <TableCell>
                    <StoreFormDrawer store={store} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
