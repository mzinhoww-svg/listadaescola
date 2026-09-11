"use client";

import { useActionState } from "react";

import { updateProfileAction, type FormState } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function ProfileForm({ fullName, email }: { fullName: string | null; email: string | null }) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <Input
        label="Nome"
        name="full_name"
        autoComplete="name"
        required
        defaultValue={fullName ?? ""}
        errorText={state?.fieldErrors?.full_name}
      />
      <Input label="E-mail" value={email ?? ""} disabled readOnly helperText="O e-mail não pode ser alterado aqui." />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-sm text-success-700">
          {state.success}
        </p>
      )}
      <SubmitButton className="mt-2 w-fit">Salvar</SubmitButton>
    </form>
  );
}
