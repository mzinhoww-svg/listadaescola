"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";

import { submitSchoolSuggestionAction, type FormState } from "@/lib/contributions/school-suggestion-actions";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function SuggestSchoolForm() {
  const [state, formAction] = useActionState(submitSchoolSuggestionAction, initialState);

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-12 text-success-600" aria-hidden="true" />
        <p className="max-w-sm text-sm text-neutral-700">{state.success}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input label="Nome da escola" name="name" placeholder="Como a escola é conhecida" required />
      <Input label="Município" name="municipality" placeholder="Ex.: Cuiabá" required />
      <Input label="Endereço (opcional)" name="address" placeholder="Rua, número, bairro" />
      <Input label="Telefone (opcional)" name="phone" type="tel" placeholder="(65) 99999-9999" />
      <Select label="Tipo (opcional)" name="school_type" defaultValue="">
        <option value="">Não sei</option>
        <option value="PUBLIC">Pública</option>
        <option value="PRIVATE">Privada</option>
      </Select>
      <Input label="Observação (opcional)" name="notes" placeholder="Outras informações que ajudem a localizar a escola" />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton className="mt-2">Enviar sugestão</SubmitButton>
    </form>
  );
}
