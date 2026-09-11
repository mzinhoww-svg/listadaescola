"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";

import { upsertEcommerceProductAction, type FormState } from "@/lib/admin/catalog-actions";
import type { AdminEcommerceProduct } from "@/lib/admin/catalog";
import type { AdminProduct } from "@/lib/admin/catalog";
import type { AdminEcommercePartner } from "@/lib/admin/ecommerce";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDrawerFormAction } from "@/hooks/use-drawer-form-action";

const initialState: FormState = {};

export function EcommerceProductFormDrawer({
  ecommerceProduct,
  partners,
  products,
}: {
  ecommerceProduct?: AdminEcommerceProduct;
  partners: AdminEcommercePartner[];
  products: AdminProduct[];
}) {
  const [open, setOpen] = React.useState(false);
  const { state, pending, handleSubmit, resetState } = useDrawerFormAction(upsertEcommerceProductAction, initialState, () => setOpen(false));

  const disabled = partners.length === 0 || products.length === 0;

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetState();
      }}
    >
      <DrawerTrigger asChild>
        {ecommerceProduct ? (
          <Button variant="ghost" size="icon" aria-label="Editar oferta">
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button disabled={disabled} title={disabled ? "Cadastre um parceiro e um produto primeiro" : undefined}>
            <Plus className="size-4" aria-hidden="true" />
            Nova oferta
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent title={ecommerceProduct ? "Editar oferta" : "Nova oferta de parceiro"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {ecommerceProduct && <input type="hidden" name="ecommerce_product_id" value={ecommerceProduct.id} />}
          <Select label="Parceiro" name="partner_id" defaultValue={ecommerceProduct?.partnerId ?? ""} required>
            <option value="" disabled>
              Selecione...
            </option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </Select>
          <Select label="Produto" name="product_id" defaultValue={ecommerceProduct?.productId ?? ""} required>
            <option value="" disabled>
              Selecione...
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
          <Input label="URL de destino" name="external_url" type="url" defaultValue={ecommerceProduct?.externalUrl ?? ""} placeholder="https://..." required />
          <Input
            label="Preço estimado (opcional)"
            name="price_hint"
            type="number"
            step="0.01"
            min={0}
            defaultValue={ecommerceProduct?.priceHint ?? ""}
            helperText="Apenas indicativo -- o parceiro define o preço real."
          />

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="is_active" defaultChecked={ecommerceProduct?.isActive ?? true} className="size-4 rounded border-neutral-300 text-primary-600" />
            Ativa
          </label>

          {state?.error && (
            <p role="alert" className="text-sm text-danger-600">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              {ecommerceProduct ? "Salvar" : "Criar oferta"}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
