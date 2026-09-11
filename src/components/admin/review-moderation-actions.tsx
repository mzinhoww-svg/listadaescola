"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";

import { approveReviewAction, rejectReviewAction, type FormState } from "@/lib/admin/review-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function ReviewModerationActions({ reviewId }: { reviewId: string }) {
  const [approveState, approveAction] = useActionState(approveReviewAction, initialState);
  const [rejectState, rejectAction] = useActionState(rejectReviewAction, initialState);
  const error = approveState?.error ?? rejectState?.error;

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
        <form action={rejectAction}>
          <input type="hidden" name="review_id" value={reviewId} />
          <SubmitButton size="sm" variant="danger">
            <X className="size-4" aria-hidden="true" />
            Recusar
          </SubmitButton>
        </form>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
