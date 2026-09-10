"use client";

import { useActionState } from "react";
import Link from "next/link";

import { signInAction, type FormState } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Input label="E-mail" name="email" type="email" autoComplete="email" required />
      <Input label="Senha" name="password" type="password" autoComplete="current-password" required />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton className="mt-2">Entrar</SubmitButton>
      <p className="text-center text-sm text-neutral-500">
        <Link href="/auth/recuperar-senha" className="font-medium text-primary-600 hover:underline">
          Esqueceu sua senha?
        </Link>
      </p>
      <p className="text-center text-sm text-neutral-500">
        Não tem conta?{" "}
        <Link href="/auth/criar-conta" className="font-medium text-primary-600 hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
