"use client";

import { useActionState } from "react";

import { updateRankingWeightsAction, type FormState } from "@/lib/admin/ranking-actions";
import type { RankingWeights } from "@/lib/admin/ranking";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function RankingWeightsForm({ weights }: { weights: RankingWeights }) {
  const [state, formAction] = useActionState(updateRankingWeightsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-5">
        <Input label="Distância" name="weight_distance" type="number" step="0.01" min={0} max={1} defaultValue={weights.weightDistance} />
        <Input label="Popularidade" name="weight_popularity" type="number" step="0.01" min={0} max={1} defaultValue={weights.weightPopularity} />
        <Input label="Listas aprovadas" name="weight_lists" type="number" step="0.01" min={0} max={1} defaultValue={weights.weightLists} />
        <Input label="Completude" name="weight_completeness" type="number" step="0.01" min={0} max={1} defaultValue={weights.weightCompleteness} />
        <Input label="Qualidade" name="weight_quality" type="number" step="0.01" min={0} max={1} defaultValue={weights.weightQuality} />
      </div>
      <p className="text-sm text-neutral-500">
        Os cinco pesos precisam somar 1.0. Afetam só o organic_score (relevância orgânica) -- nunca a avaliação
        (rating_score) nem a posição de patrocinados (sponsored_priority).
      </p>
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      {state?.success && <p className="text-sm text-success-600">{state.success}</p>}
      <div className="flex justify-end">
        <SubmitButton variant="outline">Salvar pesos</SubmitButton>
      </div>
    </form>
  );
}
