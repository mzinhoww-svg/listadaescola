"use client";

import * as React from "react";
import { useActionState } from "react";
import { Check, X } from "lucide-react";

import { approveReviewAction, rejectReviewAction, type FormState } from "@/lib/admin/review-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";

const initialState: FormState = {};

export function ReviewModerationActions({ reviewId }: { reviewId: string }) {
  const [approveState, approveAction] = useActionState(approveReviewAction, initialState);
  const [rejectState, rejectAction] = useActionState(rejectReviewAction, initialState);
  const [showReject, setShowReject] = React.useState(false);
  const error = approveState?.error ?? rejectState?.error;

  if (showReject) {
    return (
      <form action={rejectAction} className="flex flex-col items-end gap-2">
        <input type="hidden" name="review_id" value={reviewId} />
        <label htmlFor={`reject-reason-${reviewId}`} className="sr-only">
          Motivo da recusa
        </label>
        <textarea
          id={`reject-reason-${reviewId}`}
          name="reason"
          required
          rows={2}
          className="w-full min-w-52 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          placeholder="Por que esta avaliação não pode ser publicada?"
        />
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowReject(false)}>
            Cancelar
          </Button>
          <SubmitButton size="sm" variant="danger">
            <X className="size-4" aria-hidden="true" />
            Recusar
          </SubmitButton>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <form action={approveAction}>
          <input type="hidden" name="review_id" value={reviewId} />
          <SubmitButton size="sm">
            <Check className="size-4" aria-hidden="true" />
            Aprovar
          </SubmitButton>
        </form>
        <Button type="button" size="sm" variant="danger" onClick={() => setShowReject(true)}>
          <X className="size-4" aria-hidden="true" />
          Recusar
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
