"use client";

import * as React from "react";
import { useActionState, useId } from "react";
import Link from "next/link";
import { BellRing, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";
import { requestListNotificationAction, type FormState } from "@/lib/notifications/list-notification-actions";

const initialState: FormState = {};

export interface NotifiableSchool {
  id: string;
  /** Já no formato de exibição (toDisplayCase) -- este componente não formata nome. */
  name: string;
}

export interface ListNotificationFormProps {
  /**
   * Uma escola = a escola já está identificada (resultado de busca, perfil
   * da escola) e vai num campo oculto. Várias = a pessoa ainda precisa
   * dizer qual é a dela (página de município) e vira um `<select>`.
   */
  schools: NotifiableSchool[];
  /** Aberto de saída, para quando a seção inteira já é o pedido de aviso. */
  defaultOpen?: boolean;
  /** Rótulo do botão que revela o formulário quando ele nasce fechado. */
  triggerLabel?: string;
}

/**
 * Onda 3 -- o que o produto faz quando a resposta é "essa escola ainda não
 * tem lista". Onda 10 -- e onde ele faz isso.
 *
 * Até aqui esse era o fim da linha: a pessoa via "Ainda sem lista" e ia
 * embora, e o produto não ficava sabendo de nada. Com 2.722 escolas e
 * nenhuma lista publicada, esse é o desfecho de praticamente toda busca --
 * ou seja, o estado mais comum do produto era também o único sem saída.
 *
 * A Onda 3 resolveu isso só na home. Mas quem chega de busca orgânica não
 * passa pela home: cai direto numa página de município ("lista de material
 * escolar Cuiabá") ou no perfil de uma escola. Por isso o componente saiu
 * de `components/home/` e passou a aceitar mais de uma escola -- é o mesmo
 * pedido, feito de três lugares diferentes, com uma Server Action só.
 *
 * Pede só o e-mail, de propósito. Um cadastro aqui trocaria uma intenção
 * capturada por um funil abandonado.
 *
 * O aviso em si é de outra onda -- não há SMTP configurado neste projeto e
 * nada aqui dispara e-mail. Por isso a promessa é "você recebe um aviso",
 * no futuro, que é o que a captura de fato garante.
 */
export function ListNotificationForm({
  schools,
  defaultOpen = false,
  triggerLabel = "Avise-me quando publicarem",
}: ListNotificationFormProps) {
  const [state, formAction] = useActionState(requestListNotificationAction, initialState);
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const [hasInteracted, setHasInteracted] = React.useState(false);
  const firstFieldRef = React.useRef<HTMLSelectElement | HTMLInputElement>(null);
  // Vários formulários destes podem coexistir na mesma página (um por
  // resultado de busca na home), então o id não pode derivar do school_id.
  const fieldId = useId();

  React.useEffect(() => {
    // Só rouba o foco quando foi a pessoa que abriu o formulário -- num
    // `defaultOpen` isso puxaria o scroll até o meio da página no load.
    if (isOpen && hasInteracted) firstFieldRef.current?.focus();
  }, [isOpen, hasInteracted]);

  // Defensivo: uma seção que não tem escola nenhuma para oferecer não
  // renderiza um formulário que não pode dar certo.
  if (schools.length === 0) return null;

  const single = schools.length === 1 ? schools[0] : null;

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
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        onClick={() => {
          setHasInteracted(true);
          setIsOpen(true);
        }}
      >
        <BellRing className="size-4" aria-hidden="true" />
        {triggerLabel}
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg bg-neutral-100 p-3">
      {single ? (
        <input type="hidden" name="school_id" value={single.id} />
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${fieldId}-escola`} className="text-sm font-medium text-neutral-900">
            Qual é a escola?
          </label>
          {/* `<select>` nativo de propósito: em 390px o navegador abre o
              seletor em tela cheia, com busca por digitação, que é melhor
              do que qualquer combobox que a gente escrevesse aqui. */}
          <select
            ref={firstFieldRef as React.RefObject<HTMLSelectElement>}
            id={`${fieldId}-escola`}
            name="school_id"
            required
            defaultValue=""
            className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            <option value="" disabled>
              Escolha a escola
            </option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            ref={single ? (firstFieldRef as React.RefObject<HTMLInputElement>) : undefined}
            // Rótulo visível: um campo guiado só por placeholder some no
            // instante em que a pessoa começa a digitar. O nome da escola
            // fica no aria-label para quem chega pelo leitor de tela e não
            // tem o cabeçalho do card em foco.
            label="Seu e-mail"
            aria-label={single ? `Seu e-mail para o aviso sobre ${single.name}` : undefined}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="seu@email.com"
            aria-describedby={`${fieldId}-privacidade`}
          />
        </div>
        <SubmitButton className="w-full sm:w-auto">Avise-me</SubmitButton>
      </div>
      <p id={`${fieldId}-privacidade`} className="max-w-[65ch] text-sm text-neutral-600">
        Sem criar conta. Usamos o e-mail só para avisar sobre a lista dessa escola —{" "}
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
