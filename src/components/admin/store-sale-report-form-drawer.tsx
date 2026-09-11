"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";

import { upsertStoreSaleReportAction, type FormState } from "@/lib/admin/sales-actions";
import type { AdminStoreOption, AdminStoreSaleReport, StoreSaleStatus } from "@/lib/admin/sales";
import { SchoolPicker } from "@/components/contributions/school-picker";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDrawerFormAction } from "@/hooks/use-drawer-form-action";

const initialState: FormState = {};

const STATUS_OPTIONS: { value: StoreSaleStatus; label: string }[] = [
  { value: "REQUESTED", label: "Solicitado" },
  { value: "QUOTED", label: "Orçamento enviado" },
  { value: "CONVERTED", label: "Convertido (venda)" },
  { value: "LOST", label: "Perdido" },
];

export function StoreSaleReportFormDrawer({
  stores,
  report,
}: {
  stores: AdminStoreOption[];
  report?: AdminStoreSaleReport;
}) {
  const [open, setOpen] = React.useState(false);
  const initialSchool = report?.schoolId && report?.schoolName ? { id: report.schoolId, name: report.schoolName } : null;
  const [school, setSchool] = React.useState(initialSchool);
  const { state, pending, handleSubmit, resetState } = useDrawerFormAction(
    upsertStoreSaleReportAction,
    initialState,
    () => setOpen(false)
  );

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          resetState();
          setSchool(initialSchool);
        }
      }}
    >
      <DrawerTrigger asChild>
        {report ? (
          <Button variant="ghost" size="icon" aria-label={`Atualizar registro de ${report.storeName}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Novo registro
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent title={report ? `Atualizar registro · ${report.storeName}` : "Novo registro de venda (papelaria)"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {report && <input type="hidden" name="id" value={report.id} />}

          <Select label="Papelaria" name="store_id" defaultValue={report?.storeId ?? ""} required>
            <option value="" disabled>
              Selecione
            </option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </Select>

          <div>
            <p className="mb-1.5 text-sm font-medium text-neutral-900">Escola (opcional)</p>
            {school ? (
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                <span className="text-sm text-neutral-900">{school.name}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSchool(null)}>
                  Trocar
                </Button>
              </div>
            ) : (
              <SchoolPicker onSelect={(picked) => setSchool({ id: picked.id, name: picked.name })} />
            )}
            <input type="hidden" name="school_id" value={school?.id ?? ""} />
          </div>

          <Select label="Status" name="status" defaultValue={report?.status ?? "REQUESTED"} required>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor do orçamento (R$)"
              name="quoted_value"
              type="number"
              step="0.01"
              min="0"
              defaultValue={report?.quotedValue ?? ""}
            />
            <Input
              label="Valor da venda (R$)"
              name="sale_value"
              type="number"
              step="0.01"
              min="0"
              defaultValue={report?.saleValue ?? ""}
              helperText="Obrigatório se o status for Convertido"
            />
          </div>

          <Input label="Observações" name="notes" defaultValue={report?.notes ?? ""} />

          {state?.error && (
            <p role="alert" className="text-sm text-danger-600">
              {state.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              {report ? "Salvar" : "Registrar"}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
