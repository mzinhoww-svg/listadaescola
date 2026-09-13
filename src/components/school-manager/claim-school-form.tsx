"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { submitSchoolClaimAction, type FormState } from "@/lib/schools/claim-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export interface ClaimSchoolFormProps {
  schoolId: string;
  /** Sugestão de nome vinda do perfil da conta -- o campo continua
   * editável porque o nome da conta pode ser apelido e o que o admin
   * avalia é o nome declarado dentro da escola. */
  defaultName?: string;
}

/**
 * Onda 7. O formulário é curto de propósito: cada campo aqui existe
 * porque um humano precisa dele para decidir (docs/product/school-claim.md).
 * Não há campo de "comprovante" nem upload -- prometer análise de
 * documento que ninguém tem obrigação nem estrutura de conferir seria
 * teatro de verificação.
 */
export function ClaimSchoolForm({ schoolId, defaultName }: ClaimSchoolFormProps) {
  const [state, formAction] = useActionState(submitSchoolClaimAction, initialState);

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 className="size-12 text-success-600" aria-hidden="true" />
        <p className="max-w-sm text-sm text-neutral-700">{state.success}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/minha-escola">Acompanhar solicitação</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="school_id" value={schoolId} />

      <Input
        label="Seu nome completo"
        name="claimant_name"
        defaultValue={defaultName ?? ""}
        required
        errorText={state?.fieldErrors?.claimant_name}
        autoComplete="name"
      />
      <Input
        label="Seu cargo ou vínculo com a escola"
        name="claimant_role"
        placeholder="Ex.: diretora, secretária, coordenadora pedagógica"
        required
        errorText={state?.fieldErrors?.claimant_role}
      />
      <Input
        label="Telefone ou e-mail da escola"
        name="institutional_contact"
        placeholder="(65) 3333-0000 ou secretaria@escola..."
        required
        helperText="Um contato da escola, não o seu pessoal — é por ele que confirmamos o vínculo."
        errorText={state?.fieldErrors?.institutional_contact}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="justification" className="text-sm font-medium text-neutral-900">
          Como podemos confirmar que você representa a escola?
          <span className="text-danger-600" aria-hidden="true">
            {" "}
            *
          </span>
        </label>
        <textarea
          id="justification"
          name="justification"
          rows={5}
          required
          minLength={20}
          maxLength={1000}
          aria-invalid={Boolean(state?.fieldErrors?.justification) || undefined}
          aria-describedby={state?.fieldErrors?.justification ? "justification-error" : "justification-helper"}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          placeholder="Conte há quanto tempo trabalha na escola, em que horário podemos ligar e quem pode confirmar."
        />
        {state?.fieldErrors?.justification ? (
          <p id="justification-error" role="alert" className="text-sm text-danger-600">
            {state.fieldErrors.justification}
          </p>
        ) : (
          <p id="justification-helper" className="text-sm text-neutral-600">
            Nossa equipe liga ou escreve para a escola para confirmar antes de liberar o acesso.
          </p>
        )}
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg border border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {state.error}
        </p>
      )}

      <SubmitButton className="mt-2">Enviar solicitação</SubmitButton>
    </form>
  );
}
