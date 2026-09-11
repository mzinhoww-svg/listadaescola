"use client";

import { useActionState } from "react";
import Link from "next/link";

import { submitSubmissionAction, type FormState } from "@/lib/contributions/actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function SubmitReviewForm({ submissionId }: { submissionId: string }) {
  const [state, formAction] = useActionState(submitSubmissionAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="submission_id" value={submissionId} />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <div className="flex justify-between">
        <Button asChild variant="outline">
          <Link href={`/enviar-lista/${submissionId}/anexo`}>Voltar</Link>
        </Button>
        <SubmitButton>Enviar para moderação</SubmitButton>
      </div>
    </form>
  );
}
