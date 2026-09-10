"use client";

import { useActionState } from "react";

import { resendVerificationAction, type FormState } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function ResendVerificationForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction] = useActionState(resendVerificationAction, initialState);

  if (state?.success) {
    return (
      <p role="status" className="text-center text-sm text-neutral-700">
        {state.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Input
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={defaultEmail}
        required
      />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton variant="outline">Reenviar e-mail de verificação</SubmitButton>
    </form>
  );
}
