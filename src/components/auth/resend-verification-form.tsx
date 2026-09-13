"use client";

import { useActionState, useEffect, useState } from "react";

import { resendVerificationAction, type FormState } from "@/lib/auth/actions";
import { RESEND_COOLDOWN_SECONDS } from "@/lib/auth/verification";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function ResendVerificationForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction] = useActionState(resendVerificationAction, initialState);
  // Controlado de propósito: o React 19 dá reset no form depois que a
  // Server Action resolve, e um campo não controlado voltaria para o
  // `defaultValue` (vazio quando a tela é aberta sem `?email=`), obrigando
  // o usuário a redigitar o endereço só para tentar de novo.
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [handledState, setHandledState] = useState(initialState);

  // Um pedido aceito abre a janela de ~60s que o próprio GoTrue impõe entre
  // dois envios para o mesmo endereço (HTTP 429 `over_email_send_rate_limit`).
  // Contar aqui evita que o clique seguinte queime um dos 5 pedidos da janela
  // de 15 min num envio que o servidor recusaria de qualquer jeito.
  //
  // Ajuste de estado durante a renderização (padrão documentado do React para
  // reagir a uma mudança de valor), não `useEffect`: a Server Action devolve
  // um objeto novo a cada chamada, então a comparação por identidade dispara
  // uma vez por resposta e não volta a disparar nos re-renders do contador.
  if (state !== handledState) {
    setHandledState(state);
    setSecondsLeft(state?.success ? RESEND_COOLDOWN_SECONDS : 0);
  }

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Input
        label="E-mail da conta"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        errorText={state?.fieldErrors?.email}
      />
      <SubmitButton variant="outline" disabled={secondsLeft > 0}>
        {secondsLeft > 0
          ? `Aguarde ${secondsLeft}s para reenviar`
          : "Reenviar e-mail de confirmação"}
      </SubmitButton>
      {/* Live region sempre montada — um elemento inserido só na hora do
          resultado costuma não ser anunciado. `empty:hidden` evita que o
          container vazio consuma um `gap` da coluna. */}
      <div role="status" aria-live="polite" className="empty:hidden">
        {state?.success ? <p className="text-sm text-neutral-700">{state.success}</p> : null}
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
