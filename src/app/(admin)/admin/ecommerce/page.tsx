import type { Metadata } from "next";

import { getAdminEcommercePartners } from "@/lib/admin/ecommerce";
import { EcommercePartnerFormDrawer } from "@/components/admin/ecommerce-partner-form-drawer";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const INTEGRATION_LABEL: Record<string, string> = {
  DEEP_LINK: "Deep link",
  PAGE: "Página/lista",
  CART: "Carrinho",
};

export const metadata: Metadata = { title: "Parceiros de e-commerce" };

export default async function AdminEcommercePage() {
  const partners = await getAdminEcommercePartners();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Parceiros (e-commerce)</h1>
          <p className="text-sm text-neutral-500">Outbound/deep link + tracking -- sem checkout, PIX ou carrinho próprio.</p>
        </div>
        <EcommercePartnerFormDrawer />
      </div>

      {partners.length === 0 ? (
        <EmptyState title="Nenhum parceiro cadastrado" description="Crie o primeiro acima." />
      ) : (
        <Table>
          <TableCaption>Parceiros de e-commerce</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Integração</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium text-neutral-900">{partner.name}</TableCell>
                <TableCell>{INTEGRATION_LABEL[partner.integration_type] ?? partner.integration_type}</TableCell>
                <TableCell className="max-w-xs truncate">{partner.website}</TableCell>
                <TableCell>
                  <Badge variant={partner.is_active ? "success" : "neutral"}>{partner.is_active ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                <TableCell>
                  <EcommercePartnerFormDrawer partner={partner} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
