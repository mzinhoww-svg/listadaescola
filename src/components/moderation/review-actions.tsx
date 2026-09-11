"use client";

import { useActionState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Eye } from "lucide-react";

import {
  markUnderReviewAction,
  approveSubmissionAction,
  rejectSubmissionAction,
  requestCorrectionAction,
  type FormState,
} from "@/lib/moderation/actions";
import type { ModerationStatus } from "@/lib/moderation/queue";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const initialState: FormState = {};

function MarkUnderReviewForm({ submissionId }: { submissionId: string }) {
  const [state, formAction] = useActionState(markUnderReviewAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="submission_id" value={submissionId} />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton>
        <Eye className="size-4" aria-hidden="true" />
        Iniciar revisão
      </SubmitButton>
    </form>
  );
}

function ApproveForm({ submissionId }: { submissionId: string }) {
  const [state, formAction] = useActionState(approveSubmissionAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="submission_id" value={submissionId} />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton>
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Aprovar e publicar
      </SubmitButton>
    </form>
  );
}

function RejectForm({ submissionId }: { submissionId: string }) {
  const [state, formAction] = useActionState(rejectSubmissionAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="submission_id" value={submissionId} />
      <label htmlFor="reject-reason" className="text-sm font-medium text-neutral-900">
        Motivo da rejeição
      </label>
      <textarea
        id="reject-reason"
        name="reason"
        required
        rows={2}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        placeholder="Por que esta lista não pode ser publicada?"
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

function RequestCorrectionForm({ submissionId }: { submissionId: string }) {
  const [state, formAction] = useActionState(requestCorrectionAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="submission_id" value={submissionId} />
      <label htmlFor="correction-notes" className="text-sm font-medium text-neutral-900">
        O que precisa ser corrigido?
      </label>
      <textarea
        id="correction-notes"
        name="notes"
        required
        rows={2}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        placeholder="Ex.: confira a quantidade do item 3, o anexo está ilegível..."
      />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton variant="outline">
        <RotateCcw className="size-4" aria-hidden="true" />
        Pedir correção
      </SubmitButton>
    </form>
  );
}

export function ReviewActions({ submissionId, status }: { submissionId: string; status: ModerationStatus }) {
  if (status === "SUBMITTED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ação</CardTitle>
        </CardHeader>
        <CardContent>
          <MarkUnderReviewForm submissionId={submissionId} />
        </CardContent>
      </Card>
    );
  }

  if (status === "UNDER_REVIEW") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Decisão</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ApproveForm submissionId={submissionId} />
          <hr className="border-neutral-200" />
          <RequestCorrectionForm submissionId={submissionId} />
          <hr className="border-neutral-200" />
          <RejectForm submissionId={submissionId} />
        </CardContent>
      </Card>
    );
  }

  return null;
}
