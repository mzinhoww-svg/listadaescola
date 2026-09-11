"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";

import { upsertStoreAction, type FormState } from "@/lib/admin/store-actions";
import type { AdminStore } from "@/lib/admin/stores";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDrawerFormAction } from "@/hooks/use-drawer-form-action";

const initialState: FormState = {};

export function StoreFormDrawer({ store }: { store?: AdminStore }) {
  const [open, setOpen] = React.useState(false);
  const { state, pending, handleSubmit, resetState } = useDrawerFormAction(upsertStoreAction, initialState, () => setOpen(false));

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetState();
      }}
    >
      <DrawerTrigger asChild>
        {store ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${store.name}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Nova papelaria
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent title={store ? `Editar ${store.name}` : "Nova papelaria"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {store && <input type="hidden" name="store_id" value={store.id} />}
          <Input label="Nome" name="name" defaultValue={store?.name ?? ""} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="UF" name="uf" defaultValue={store?.uf ?? "MT"} maxLength={2} required />
            <Input label="Município" name="municipality" defaultValue={store?.municipality ?? ""} required />
          </div>
          <Input label="Endereço" name="address" defaultValue={store?.address ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude" name="latitude" type="number" step="any" defaultValue={store?.latitude ?? ""} />
            <Input label="Longitude" name="longitude" type="number" step="any" defaultValue={store?.longitude ?? ""} />
          </div>
          <Input label="WhatsApp" name="whatsapp" defaultValue={store?.whatsapp ?? ""} placeholder="(65) 90000-0000" required />
          <Input label="Horário de funcionamento" name="opening_hours" defaultValue={store?.opening_hours ?? ""} placeholder="Seg-sex 8h-18h" />

          <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" name="offers_delivery" defaultChecked={store?.offers_delivery ?? false} className="size-4 rounded border-neutral-300 text-primary-600" />
              Oferece entrega
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" name="offers_pickup" defaultChecked={store?.offers_pickup ?? false} className="size-4 rounded border-neutral-300 text-primary-600" />
              Oferece retirada
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" name="is_active" defaultChecked={store?.is_active ?? true} className="size-4 rounded border-neutral-300 text-primary-600" />
              Ativa (visível publicamente)
            </label>
          </div>

          {state?.error && (
            <p role="alert" className="text-sm text-danger-600">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              {store ? "Salvar" : "Criar papelaria"}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
