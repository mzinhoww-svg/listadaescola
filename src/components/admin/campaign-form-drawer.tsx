"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { createCampaignAction, type FormState } from "@/lib/admin/campaign-actions";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDrawerFormAction } from "@/hooks/use-drawer-form-action";

const initialState: FormState = {};

export function CampaignFormDrawer() {
  const [open, setOpen] = React.useState(false);
  const { state, pending, handleSubmit, resetState } = useDrawerFormAction(createCampaignAction, initialState, () => setOpen(false));

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetState();
      }}
    >
      <DrawerTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          Nova campanha
        </Button>
      </DrawerTrigger>
      <DrawerContent title="Nova campanha de patrocínio">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select label="Tipo" name="entity_type" defaultValue="SCHOOL" required>
            <option value="SCHOOL">Escola</option>
            <option value="STORE">Papelaria</option>
          </Select>
          <Input
            label="Nome exato"
            name="entity_name"
            required
            helperText="Precisa bater exatamente com o nome cadastrado (ver Escolas/Papelarias)."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Início" name="starts_at" type="datetime-local" required />
            <Input label="Fim" name="ends_at" type="datetime-local" required />
          </div>
          <Input label="Prioridade" name="priority" type="number" min={0} step="1" defaultValue={0} helperText="Maior prioridade aparece primeiro entre patrocinados." />

          {state?.error && (
            <p role="alert" className="text-sm text-danger-600">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              Criar campanha
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
