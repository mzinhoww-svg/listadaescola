"use client";

import * as React from "react";
import { Plus, Check } from "lucide-react";

import { createCampaignAction, type FormState } from "@/lib/admin/campaign-actions";
import type { AdminStore } from "@/lib/admin/stores";
import type { SchoolSearchOption } from "@/lib/contributions/actions";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SchoolPicker } from "@/components/contributions/school-picker";
import { useDrawerFormAction } from "@/hooks/use-drawer-form-action";

const initialState: FormState = {};

export function CampaignFormDrawer({ stores }: { stores: AdminStore[] }) {
  const [open, setOpen] = React.useState(false);
  const [entityType, setEntityType] = React.useState<"SCHOOL" | "STORE">("SCHOOL");
  const [selectedSchool, setSelectedSchool] = React.useState<SchoolSearchOption | null>(null);
  const [storeId, setStoreId] = React.useState("");
  const { state, pending, handleSubmit, resetState } = useDrawerFormAction(createCampaignAction, initialState, () => setOpen(false));

  function resetSelection() {
    setSelectedSchool(null);
    setStoreId("");
  }

  const entityName = entityType === "SCHOOL" ? (selectedSchool?.name ?? "") : (stores.find((store) => store.id === storeId)?.name ?? "");

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          resetState();
          resetSelection();
          setEntityType("SCHOOL");
        }
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
          <Select
            label="Tipo"
            name="entity_type"
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value as "SCHOOL" | "STORE");
              resetSelection();
            }}
            required
          >
            <option value="SCHOOL">Escola</option>
            <option value="STORE">Papelaria</option>
          </Select>

          <input type="hidden" name="entity_name" value={entityName} />

          {entityType === "SCHOOL" ? (
            selectedSchool ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-primary-200 bg-primary-50 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="size-4 shrink-0 text-primary-600" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-neutral-900">{selectedSchool.name}</p>
                    <p className="text-neutral-500">{selectedSchool.municipality}</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedSchool(null)}>
                  Trocar
                </Button>
              </div>
            ) : (
              <SchoolPicker onSelect={setSelectedSchool} />
            )
          ) : (
            <Select label="Papelaria" name="store_id" value={storeId} onChange={(event) => setStoreId(event.target.value)} required>
              <option value="">Selecione...</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </Select>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Início" name="starts_at" type="datetime-local" required />
            <Input label="Fim" name="ends_at" type="datetime-local" required />
          </div>
          <Input
            label="Prioridade"
            name="priority"
            type="number"
            min={0}
            step="1"
            defaultValue={0}
            helperText="Maior prioridade aparece primeiro entre patrocinados."
          />

          {state?.error && (
            <p role="alert" className="text-sm text-danger-600">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={pending} disabled={!entityName}>
              Criar campanha
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
