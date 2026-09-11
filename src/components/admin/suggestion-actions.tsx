"use client";

import { useActionState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import {
  approveSchoolSuggestionAction,
  rejectSchoolSuggestionAction,
  type FormState,
} from "@/lib/admin/school-suggestion-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const initialState: FormState = {};

function ApproveForm({ suggestionId }: { suggestionId: string }) {
  const [state, formAction] = useActionState(approveSchoolSuggestionAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="suggestion_id" value={suggestionId} />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton>
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Aprovar sugestão
      </SubmitButton>
    </form>
  );
}

function RejectForm({ suggestionId }: { suggestionId: string }) {
  const [state, formAction] = useActionState(rejectSchoolSuggestionAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="suggestion_id" value={suggestionId} />
      <label htmlFor="suggestion-reject-reason" className="text-sm font-medium text-neutral-900">
        Motivo da rejeição
      </label>
      <textarea
        id="suggestion-reject-reason"
        name="reason"
        required
        rows={2}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        placeholder="Ex.: escola duplicada, dados insuficientes..."
      />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton variant="danger">
        <XCircle className="size-4" aria-hidden="true" />
        Rejeitar
      </SubmitButton>
    </form>
  );
}

export function SuggestionActions({ suggestionId, status }: { suggestionId: string; status: string }) {
  if (status !== "SUBMITTED") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decisão</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ApproveForm suggestionId={suggestionId} />
        <hr className="border-neutral-200" />
        <RejectForm suggestionId={suggestionId} />
      </CardContent>
    </Card>
  );
}
