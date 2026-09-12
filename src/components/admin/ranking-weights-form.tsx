"use client";

import * as React from "react";
import { useActionState } from "react";

import { updateRankingWeightsAction, type FormState } from "@/lib/admin/ranking-actions";
import type { RankingWeights } from "@/lib/admin/ranking";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/auth/submit-button";
import { cn } from "@/lib/utils";

const initialState: FormState = {};

const FIELDS = [
  { key: "distance", name: "weight_distance", label: "Distância" },
  { key: "popularity", name: "weight_popularity", label: "Popularidade" },
  { key: "lists", name: "weight_lists", label: "Listas aprovadas" },
  { key: "completeness", name: "weight_completeness", label: "Completude" },
  { key: "quality", name: "weight_quality", label: "Qualidade" },
] as const;

export function RankingWeightsForm({ weights }: { weights: RankingWeights }) {
  const [state, formAction] = useActionState(updateRankingWeightsAction, initialState);
  // Controlled (not defaultValue): an uncontrolled form reverted to the
  // stale DB values whenever the server action returned an error (e.g. an
  // invalid sum), silently discarding exactly what the admin had just
  // typed and needed to correct.
  const [values, setValues] = React.useState<Record<(typeof FIELDS)[number]["key"], number>>({
    distance: weights.weightDistance,
    popularity: weights.weightPopularity,
    lists: weights.weightLists,
    completeness: weights.weightCompleteness,
    quality: weights.weightQuality,
  });

  const sum = Object.values(values).reduce((total: number, value) => total + (Number.isFinite(value) ? value : 0), 0);
  const sumIsValid = Math.abs(sum - 1) < 0.001;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-5">
        {FIELDS.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            name={field.name}
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={values[field.key]}
            onChange={(event) => {
              const next = Number(event.target.value);
              setValues((prev) => ({ ...prev, [field.key]: Number.isNaN(next) ? 0 : next }));
            }}
          />
        ))}
      </div>
      <p className={cn("text-sm", sumIsValid ? "text-neutral-500" : "font-medium text-danger-600")}>
        Soma atual: {sum.toFixed(2)} -- os cinco pesos precisam somar 1,00. Afetam só o organic_score (relevância
        orgânica) -- nunca a avaliação (rating_score) nem a posição de patrocinados (sponsored_priority).
      </p>
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      {state?.success && <p className="text-sm text-success-600">{state.success}</p>}
      <div className="flex justify-end">
        <SubmitButton variant="outline" disabled={!sumIsValid}>
          Salvar pesos
        </SubmitButton>
      </div>
    </form>
  );
}
