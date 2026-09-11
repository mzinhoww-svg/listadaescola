"use client";

import * as React from "react";
import { useActionState } from "react";
import { Pencil, Plus } from "lucide-react";

import { upsertEcommercePartnerAction, type FormState } from "@/lib/admin/ecommerce-actions";
import type { AdminEcommercePartner } from "@/lib/admin/ecommerce";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/auth/submit-button";
import { useCloseOnActionSuccess } from "@/hooks/use-close-on-action-success";

const initialState: FormState = {};

export function EcommercePartnerFormDrawer({ partner }: { partner?: AdminEcommercePartner }) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState(upsertEcommercePartnerAction, initialState);
  useCloseOnActionSuccess(state, setOpen);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {partner ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${partner.name}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Novo parceiro
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent title={partner ? `Editar ${partner.name}` : "Novo parceiro de e-commerce"}>
        <form action={formAction} className="flex flex-col gap-4">
          {partner && <input type="hidden" name="partner_id" value={partner.id} />}
          <Input label="Nome" name="name" defaultValue={partner?.name ?? ""} required />
          <Input label="Website" name="website" type="url" defaultValue={partner?.website ?? ""} placeholder="https://..." required />
          <Input label="URL do logo" name="logo_url" type="url" defaultValue={partner?.logo_url ?? ""} placeholder="https://..." />
          <Select label="Tipo de integração" name="integration_type" defaultValue={partner?.integration_type ?? "DEEP_LINK"} required>
            <option value="DEEP_LINK">Deep link</option>
            <option value="PAGE">Página/lista</option>
            <option value="CART">Carrinho</option>
          </Select>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="is_active" defaultChecked={partner?.is_active ?? true} className="size-4 rounded border-neutral-300 text-primary-600" />
            Ativo (visível publicamente)
          </label>

          {state?.error && (
            <p role="alert" className="text-sm text-danger-600">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <SubmitButton>{partner ? "Salvar" : "Criar parceiro"}</SubmitButton>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
