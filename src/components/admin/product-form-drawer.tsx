"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";

import { upsertProductAction, type FormState } from "@/lib/admin/catalog-actions";
import type { AdminProduct } from "@/lib/admin/catalog";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDrawerFormAction } from "@/hooks/use-drawer-form-action";

const initialState: FormState = {};

export function ProductFormDrawer({ product }: { product?: AdminProduct }) {
  const [open, setOpen] = React.useState(false);
  const { state, pending, handleSubmit, resetState } = useDrawerFormAction(upsertProductAction, initialState, () => setOpen(false));

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetState();
      }}
    >
      <DrawerTrigger asChild>
        {product ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${product.name}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Novo produto
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent title={product ? `Editar ${product.name}` : "Novo produto"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {product && <input type="hidden" name="product_id" value={product.id} />}
          <Input label="Nome" name="name" defaultValue={product?.name ?? ""} placeholder="Ex.: Caderno brochura 96 folhas" required />
          <Input label="Marca (opcional)" name="brand" defaultValue={product?.brand ?? ""} placeholder="Ex.: Tilibra" />
          <Input label="Categoria (opcional)" name="category" defaultValue={product?.category ?? ""} placeholder="Ex.: Cadernos" />

          {state?.error && (
            <p role="alert" className="text-sm text-danger-600">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              {product ? "Salvar" : "Criar produto"}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
