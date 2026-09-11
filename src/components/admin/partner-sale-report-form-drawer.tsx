"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";

import { upsertPartnerSaleReportAction, type FormState } from "@/lib/admin/sales-actions";
import type { AdminPartnerOption, AdminPartnerSaleReport } from "@/lib/admin/sales";
import { SchoolPicker } from "@/components/contributions/school-picker";
import { Drawer, DrawerTrigger, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDrawerFormAction } from "@/hooks/use-drawer-form-action";

const initialState: FormState = {};

export function PartnerSaleReportFormDrawer({
  partners,
  report,
}: {
  partners: AdminPartnerOption[];
  report?: AdminPartnerSaleReport;
}) {
  const [open, setOpen] = React.useState(false);
  const initialSchool = report?.schoolId && report?.schoolName ? { id: report.schoolId, name: report.schoolName } : null;
  const [school, setSchool] = React.useState(initialSchool);
  const { state, pending, handleSubmit, resetState } = useDrawerFormAction(
    upsertPartnerSaleReportAction,
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
          <Button variant="ghost" size="icon" aria-label={`Atualizar registro de ${report.partnerName}`}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Novo registro
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent title={report ? `Atualizar registro · ${report.partnerName}` : "Novo registro de venda (e-commerce)"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {report && <input type="hidden" name="id" value={report.id} />}

          <Select label="Parceiro" name="partner_id" defaultValue={report?.partnerId ?? ""} required>
            <option value="" disabled>
              Selecione
            </option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
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

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor bruto (R$)"
              name="gross_value"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={report?.grossValue ?? ""}
              required
            />
            <Input
              label="Comissão (R$)"
              name="commission_value"
              type="number"
              step="0.01"
              min="0"
              defaultValue={report?.commissionValue ?? 0}
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
