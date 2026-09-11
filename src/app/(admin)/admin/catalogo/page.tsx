import type { Metadata } from "next";

import { getAdminProducts, getAdminEcommerceProducts } from "@/lib/admin/catalog";
import { getAdminEcommercePartners } from "@/lib/admin/ecommerce";
import { ProductFormDrawer } from "@/components/admin/product-form-drawer";
import { EcommerceProductFormDrawer } from "@/components/admin/ecommerce-product-form-drawer";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Catálogo" };

export default async function AdminCatalogPage() {
  const [products, ecommerceProducts, partners] = await Promise.all([
    getAdminProducts(),
    getAdminEcommerceProducts(),
    getAdminEcommercePartners(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Catálogo</h1>
        <p className="text-sm text-neutral-500">Produtos genéricos (sem preço) + ofertas de parceiros (com link de saída).</p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-neutral-900">Produtos</h2>
          <ProductFormDrawer />
        </div>
        {products.length === 0 ? (
          <EmptyState title="Nenhum produto cadastrado" description="Crie o primeiro acima." />
        ) : (
          <Table>
            <TableCaption>Catálogo de produtos</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium text-neutral-900">{product.name}</TableCell>
                  <TableCell>{product.brand ?? "—"}</TableCell>
                  <TableCell>{product.category ?? "—"}</TableCell>
                  <TableCell>
                    <ProductFormDrawer product={product} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-neutral-900">Ofertas de parceiros</h2>
          <EcommerceProductFormDrawer partners={partners} products={products} />
        </div>
        {ecommerceProducts.length === 0 ? (
          <EmptyState title="Nenhuma oferta cadastrada" description="Mapeie um produto a um parceiro acima." />
        ) : (
          <Table>
            <TableCaption>Mapeamentos de parceiros</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Parceiro</TableHead>
                <TableHead>Preço estimado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ecommerceProducts.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell className="font-medium text-neutral-900">{offer.product.name}</TableCell>
                  <TableCell>{offer.partner.name}</TableCell>
                  <TableCell>{offer.priceHint !== null ? `R$ ${offer.priceHint.toFixed(2)}` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={offer.isActive ? "success" : "neutral"}>{offer.isActive ? "Ativa" : "Inativa"}</Badge>
                  </TableCell>
                  <TableCell>
                    <EcommerceProductFormDrawer ecommerceProduct={offer} partners={partners} products={products} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
