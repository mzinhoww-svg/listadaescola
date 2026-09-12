"use client";

import { useActionState } from "react";

import { updateSchoolAction, type FormState } from "@/lib/admin/school-actions";
import type { AdminSchoolDetail } from "@/lib/admin/schools";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function SchoolEditForm({ school }: { school: AdminSchoolDetail }) {
  const [state, formAction] = useActionState(updateSchoolAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="school_id" value={school.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Website" name="website" type="url" defaultValue={school.profile.website ?? ""} placeholder="https://..." />
        <Input label="Instagram" name="instagram" defaultValue={school.profile.instagram ?? ""} placeholder="@escola" />
        <Input label="WhatsApp" name="whatsapp" defaultValue={school.profile.whatsapp ?? ""} placeholder="(65) 90000-0000" />
        <Input label="URL do logo" name="logo_url" type="url" defaultValue={school.profile.logoUrl ?? ""} placeholder="https://..." />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-neutral-900">
          Descrição
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={school.profile.description ?? ""}
          maxLength={1000}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          placeholder="Sobre a escola, diferenciais, infraestrutura..."
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={school.isActive}
            className="size-4 rounded border-neutral-300 accent-primary-600 text-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          />
          Escola ativa (visível publicamente)
        </label>
        {school.isActive && (school.hasActiveCampaign || school.hasPublishedList) && (
          <p className="text-sm text-warning-700">
            Atenção: esta escola tem {school.hasActiveCampaign && "um patrocínio ativo"}
            {school.hasActiveCampaign && school.hasPublishedList && " e "}
            {school.hasPublishedList && "uma lista publicada"}. Desmarcar &ldquo;Escola ativa&rdquo; a esconde
            imediatamente das páginas públicas.
          </p>
        )}
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            name="is_verified"
            defaultChecked={school.profile.isVerified}
            className="size-4 rounded border-neutral-300 accent-primary-600 text-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          />
          Escola verificada
        </label>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      {state?.success && <p className="text-sm text-success-600">{state.success}</p>}

      <div className="flex justify-end">
        <SubmitButton>Salvar alterações</SubmitButton>
      </div>
    </form>
  );
}
