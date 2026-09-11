import type { Metadata } from "next";

import { getAdminStores } from "@/lib/admin/stores";
import { StoreFormDrawer } from "@/components/admin/store-form-drawer";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Papelarias" };

export default async function AdminStoresPage() {
  const stores = await getAdminStores();

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
            {stores.map((store) => (
              <TableRow key={store.id}>
                <TableCell className="font-medium text-neutral-900">{store.name}</TableCell>
                <TableCell>
                  {store.municipality}/{store.uf}
                </TableCell>
                <TableCell>{store.whatsapp}</TableCell>
                <TableCell>
                  {store.offers_delivery && <Badge variant="info">Entrega</Badge>}{" "}
                  {store.offers_pickup && <Badge variant="info">Retirada</Badge>}
                </TableCell>
                <TableCell>
                  <Badge variant={store.is_active ? "success" : "neutral"}>{store.is_active ? "Ativa" : "Inativa"}</Badge>
                </TableCell>
                <TableCell>
                  <StoreFormDrawer store={store} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
