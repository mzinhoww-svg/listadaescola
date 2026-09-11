"use client";

import { useActionState } from "react";
import Link from "next/link";

import { requestPasswordResetAction, type FormState } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);

  if (state?.success) {
    return (
      <p role="status" className="text-center text-sm text-neutral-700">
        {state.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        errorText={state?.fieldErrors?.email}
      />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton className="mt-2">Enviar link de redefinição</SubmitButton>
      <p className="text-center text-sm text-neutral-500">
        <Link href="/auth/entrar" className="font-medium text-primary-600 hover:underline">
          Voltar para entrar
        </Link>
      </p>
    </form>
  );
}
