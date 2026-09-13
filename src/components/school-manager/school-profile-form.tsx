"use client";

import { useActionState } from "react";

import { updateManagedSchoolProfileAction, type FormState } from "@/lib/schools/manager-actions";
import type { ManagedSchool } from "@/lib/schools/manager";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

/**
 * Versão restrita do `SchoolEditForm` do admin
 * (src/components/admin/school-edit-form.tsx). O que sai, e por quê:
 *
 *   - "Escola ativa": tirar a escola do ar é decisão editorial da equipe;
 *   - "Escola verificada": o selo é a palavra da plataforma sobre a
 *     escola, não da escola sobre si mesma. O trigger
 *     `school_profiles_protect_admin_columns` restaura a coluna mesmo que
 *     alguém poste direto no PostgREST -- o campo não estar aqui é UX, a
 *     trava é banco;
 *   - "URL do logo": campo de texto para URL não faz sentido para uma
 *     secretária de escola. Fica com o admin até existir upload de logo.
 */
export function SchoolProfileForm({ school, municipalitySlug }: { school: ManagedSchool; municipalitySlug: string }) {
  const [state, formAction] = useActionState(updateManagedSchoolProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="school_id" value={school.id} />
      <input type="hidden" name="school_slug" value={school.slug} />
      <input type="hidden" name="school_uf" value={school.uf.toLowerCase()} />
      <input type="hidden" name="school_municipality_slug" value={municipalitySlug} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-neutral-900">
          Sobre a escola
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={school.profile.description ?? ""}
          maxLength={1000}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          placeholder="Proposta pedagógica, turnos, infraestrutura, o que diferencia a escola..."
        />
        <p className="text-sm text-neutral-600">Aparece no perfil público, logo abaixo do nome da escola.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Site"
          name="website"
          type="url"
          defaultValue={school.profile.website ?? ""}
          placeholder="https://..."
        />
        <Input label="Instagram" name="instagram" defaultValue={school.profile.instagram ?? ""} placeholder="@escola" />
        <Input
          label="WhatsApp"
          name="whatsapp"
          defaultValue={school.profile.whatsapp ?? ""}
          placeholder="(65) 90000-0000"
          helperText="Vira link de conversa no perfil público quando for um número brasileiro válido."
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-sm text-success-600">
          {state.success}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton>Salvar alterações</SubmitButton>
      </div>
    </form>
  );
}
