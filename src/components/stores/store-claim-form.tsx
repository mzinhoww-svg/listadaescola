"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { submitStoreClaimAction, type FormState } from "@/lib/stores/store-claim-actions";
import type { ClaimableStore } from "@/lib/stores/store-claims";
import { STORE_SERVICE_OPTIONS } from "@/lib/stores/services";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";

const initialState: FormState = {};

type ClaimKind = "new" | "existing";

export function StoreClaimForm({ claimableStores }: { claimableStores: ClaimableStore[] }) {
  const [state, formAction] = useActionState(submitStoreClaimAction, initialState);
  const [kind, setKind] = useState<ClaimKind>("new");

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-12 text-success-600" aria-hidden="true" />
        <p className="max-w-sm text-sm text-neutral-700">{state.success}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/minha-papelaria">Acompanhar solicitação</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-neutral-900">
          Sua papelaria já aparece no Listada Escola?
        </legend>
        <label
          className={cn(
            "flex items-start gap-2 rounded-lg border p-3 text-sm text-neutral-700",
            kind === "new" ? "border-primary-500 bg-primary-50" : "border-neutral-300"
          )}
        >
          <input
            type="radio"
            name="claim_kind"
            value="new"
            checked={kind === "new"}
            onChange={() => setKind("new")}
            className="mt-0.5 size-4 text-primary-600"
          />
          <span>
            <span className="block font-medium text-neutral-900">Ainda não</span>
            Quero cadastrar minha papelaria.
          </span>
        </label>
        <label
          className={cn(
            "flex items-start gap-2 rounded-lg border p-3 text-sm",
            kind === "existing" ? "border-primary-500 bg-primary-50" : "border-neutral-300",
            claimableStores.length === 0 ? "text-neutral-500" : "text-neutral-700"
          )}
        >
          <input
            type="radio"
            name="claim_kind"
            value="existing"
            checked={kind === "existing"}
            onChange={() => setKind("existing")}
            disabled={claimableStores.length === 0}
            className="mt-0.5 size-4 text-primary-600"
          />
          <span>
            <span className="block font-medium text-neutral-900">Já aparece</span>
            {claimableStores.length === 0
              ? "Nenhuma papelaria cadastrada nesta região ainda."
              : "Quero assumir a gestão do cadastro que já existe."}
          </span>
        </label>
      </fieldset>

      {kind === "existing" ? (
        <Select label="Qual é a sua papelaria?" name="store_id" required defaultValue="">
          <option value="" disabled>
            Escolha na lista
          </option>
          {claimableStores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name} — {store.municipality}/{store.uf}
            </option>
          ))}
        </Select>
      ) : (
        <>
          <Input label="Nome da papelaria" name="store_name" placeholder="Como sua loja é conhecida" required maxLength={200} />
          <Input label="Município" name="municipality" placeholder="Ex.: Cuiabá" required maxLength={120} />
        </>
      )}

      <Input
        label="WhatsApp de atendimento"
        name="whatsapp"
        type="tel"
        required
        placeholder="(65) 99999-9999"
        helperText="É por aqui que as famílias vão pedir orçamento com a lista já preenchida."
      />
      <Input label="Endereço (opcional)" name="address" placeholder="Rua, número, bairro" maxLength={300} />
      <Input
        label="Horário de funcionamento (opcional)"
        name="opening_hours"
        placeholder="Seg-sex 8h-18h, sáb 8h-12h"
        maxLength={200}
      />

      <fieldset className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium text-neutral-900">Atendimento</legend>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="offers_delivery" className="size-4 rounded border-neutral-300 text-primary-600" />
          Faço entrega
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="offers_pickup" className="size-4 rounded border-neutral-300 text-primary-600" />
          Cliente pode retirar na loja
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4">
        <legend className="px-1 text-sm font-medium text-neutral-900">Serviços (opcional)</legend>
        {STORE_SERVICE_OPTIONS.map((service) => (
          <label key={service} className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="services"
              value={service}
              className="size-4 rounded border-neutral-300 text-primary-600"
            />
            {service}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="store-claim-notes" className="text-sm font-medium text-neutral-900">
          Observação para nossa equipe (opcional)
        </label>
        <textarea
          id="store-claim-notes"
          name="notes"
          rows={3}
          maxLength={1000}
          placeholder="CNPJ, site, redes sociais ou qualquer coisa que ajude a confirmar que a papelaria é sua."
          className="rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        />
      </div>

      <p className="text-sm text-neutral-600">
        O Listada Escola não processa pagamento, cobrança nem comissão de venda: a negociação acontece direto
        entre você e o cliente, pelo WhatsApp.
      </p>

      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}

      <SubmitButton className="mt-1">Enviar solicitação</SubmitButton>
    </form>
  );
}
