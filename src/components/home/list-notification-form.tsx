"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { BellRing, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";
import { requestListNotificationAction, type FormState } from "@/lib/notifications/list-notification-actions";

const initialState: FormState = {};

export interface ListNotificationFormProps {
  schoolId: string;
  schoolName: string;
}

/**
 * Onda 3 -- o que a home faz quando a resposta é "essa escola ainda não
 * tem lista".
 *
 * Até aqui esse era o fim da linha: a pessoa via "Ainda sem lista" e ia
 * embora, e o produto não ficava sabendo de nada. Com 2.722 escolas e
 * nenhuma lista publicada, esse é o desfecho de praticamente toda busca --
 * ou seja, o estado mais comum do produto era também o único sem saída.
 *
 * Pede só o e-mail, de propósito. Um cadastro aqui trocaria uma intenção
 * capturada por um funil abandonado. Fica fechado até a pessoa pedir
 * (`isOpen`) para não transformar cada resultado numa cobrança de e-mail.
 *
 * O aviso em si é de outra onda -- não há SMTP configurado neste projeto e
 * nada aqui dispara e-mail. Por isso a promessa é "você recebe um aviso",
 * no futuro, que é o que a captura de fato garante.
 */
export function ListNotificationForm({ schoolId, schoolName }: ListNotificationFormProps) {
  const [state, formAction] = useActionState(requestListNotificationAction, initialState);
  const [isOpen, setIsOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (state.success) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span className="max-w-[65ch]">{state.success}</span>
      </p>
    );
  }

  if (!isOpen) {
    return (
      <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setIsOpen(true)}>
        <BellRing className="size-4" aria-hidden="true" />
        Avise-me quando publicarem
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg bg-neutral-100 p-3">
      <input type="hidden" name="school_id" value={schoolId} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            ref={inputRef}
            // Rótulo visível: um campo guiado só por placeholder some no
            // instante em que a pessoa começa a digitar. O nome da escola
            // fica no aria-label para quem chega pelo leitor de tela e não
            // tem o cabeçalho do card em foco.
            label="Seu e-mail"
            aria-label={`Seu e-mail para o aviso sobre ${schoolName}`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="seu@email.com"
            aria-describedby={`${schoolId}-privacidade`}
          />
        </div>
        <SubmitButton className="w-full sm:w-auto">Avise-me</SubmitButton>
      </div>
      <p id={`${schoolId}-privacidade`} className="max-w-[65ch] text-sm text-neutral-600">
        Sem criar conta. Usamos o e-mail só para avisar sobre a lista desta escola —{" "}
        <Link href="/privacidade" className="underline underline-offset-2 hover:text-neutral-900">
          como tratamos seus dados
        </Link>
        .
      </p>
      {state.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
