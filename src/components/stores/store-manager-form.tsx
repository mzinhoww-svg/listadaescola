"use client";

import { useActionState } from "react";

import { updateManagedStoreAction, type FormState } from "@/lib/stores/manager-actions";
import type { ManagedStore } from "@/lib/stores/manager";
import { STORE_SERVICE_OPTIONS } from "@/lib/stores/services";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function StoreManagerForm({ store }: { store: ManagedStore }) {
  const [state, formAction] = useActionState(updateManagedStoreAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="store_id" value={store.id} />

      <Input label="Nome da papelaria" name="name" defaultValue={store.name} required maxLength={200} />
      <Input label="Município" name="municipality" defaultValue={store.municipality} required maxLength={120} />
      <Input label="Endereço" name="address" defaultValue={store.address ?? ""} maxLength={300} placeholder="Rua, número, bairro" />
      <Input
        label="WhatsApp de atendimento"
        name="whatsapp"
        type="tel"
        defaultValue={store.whatsapp}
        required
        helperText="Validamos e normalizamos o número no servidor — se ele não for um WhatsApp brasileiro válido, o botão não aparece para as famílias."
      />
      <Input
        label="Horário de funcionamento"
        name="opening_hours"
        defaultValue={store.openingHours ?? ""}
        maxLength={200}
        placeholder="Seg-sex 8h-18h, sáb 8h-12h"
      />

      <fieldset className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium text-neutral-900">Atendimento</legend>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            name="offers_delivery"
            defaultChecked={store.offersDelivery}
            className="size-4 rounded border-neutral-300 text-primary-600"
          />
          Faço entrega
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            name="offers_pickup"
            defaultChecked={store.offersPickup}
            className="size-4 rounded border-neutral-300 text-primary-600"
          />
          Cliente pode retirar na loja
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium text-neutral-900">Serviços</legend>
        {STORE_SERVICE_OPTIONS.map((service) => (
          <label key={service} className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="services"
              value={service}
              defaultChecked={store.services.includes(service)}
              className="size-4 rounded border-neutral-300 text-primary-600"
            />
            {service}
          </label>
        ))}
      </fieldset>

      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-sm text-success-700">
          {state.success}
        </p>
      )}

      <SubmitButton className="w-fit">Salvar alterações</SubmitButton>
    </form>
  );
}
