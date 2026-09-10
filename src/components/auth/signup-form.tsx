"use client";

import { useActionState } from "react";
import Link from "next/link";

import { signUpAction, type FormState } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function SignupForm() {
  const [state, formAction] = useActionState(signUpAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input label="Nome completo" name="full_name" autoComplete="name" required />
      <Input label="E-mail" name="email" type="email" autoComplete="email" required />
      <Input
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        helperText="Mínimo de 8 caracteres."
        required
      />
      <Input
        label="Confirmar senha"
        name="confirm_password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton className="mt-2">Criar conta</SubmitButton>
      <p className="text-center text-sm text-neutral-500">
        Já tem conta?{" "}
        <Link href="/auth/entrar" className="font-medium text-primary-600 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
