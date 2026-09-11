"use client";

import { useActionState } from "react";

import { createReviewAction, type ReviewFormState } from "@/lib/reviews/actions";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: ReviewFormState = {};

const RATING_OPTIONS = [
  { value: "5", label: "5 - Excelente" },
  { value: "4", label: "4 - Boa" },
  { value: "3", label: "3 - Regular" },
  { value: "2", label: "2 - Ruim" },
  { value: "1", label: "1 - Péssima" },
];

export interface ReviewFormProps {
  schoolId: string;
  path: string;
  existing?: { rating: number; comment: string | null };
}

export function ReviewForm({ schoolId, path, existing }: ReviewFormProps) {
  const [state, formAction] = useActionState(createReviewAction, initialState);

  if (state?.success) {
    return (
      <p role="status" className="text-sm text-success-700">
        {state.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-3">
      <input type="hidden" name="school_id" value={schoolId} />
      <input type="hidden" name="path" value={path} />
      {existing && (
        <p className="text-sm text-neutral-600">Sua avaliação está em análise. Você pode atualizá-la abaixo.</p>
      )}
      <Select label="Nota" name="rating" defaultValue={String(existing?.rating ?? 5)} required>
        {RATING_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-comment" className="text-sm font-medium text-neutral-900">
          Comentário (opcional)
        </label>
        <textarea
          id="review-comment"
          name="comment"
          rows={3}
          maxLength={1000}
          defaultValue={existing?.comment ?? ""}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          placeholder="Conte como foi sua experiência com esta escola."
        />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton className="w-fit">Enviar avaliação</SubmitButton>
      <p className="text-xs text-neutral-500">Sua avaliação passa por moderação antes de aparecer publicamente.</p>
    </form>
  );
}
