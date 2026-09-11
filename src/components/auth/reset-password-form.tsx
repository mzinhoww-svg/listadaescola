"use client";

import { useActionState } from "react";

import { updatePasswordAction, type FormState } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        helperText="Mínimo de 8 caracteres."
        required
        errorText={state?.fieldErrors?.password}
      />
      <Input
        label="Confirmar nova senha"
        name="confirm_password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        errorText={state?.fieldErrors?.confirm_password}
      />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton className="mt-2">Redefinir senha</SubmitButton>
    </form>
  );
}
