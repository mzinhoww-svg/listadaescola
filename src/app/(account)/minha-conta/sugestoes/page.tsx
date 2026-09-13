import type { Metadata } from "next";
import Link from "next/link";
import { XCircle } from "lucide-react";

import { getOwnSchoolSuggestions } from "@/lib/contributions/queries";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toDisplayCase } from "@/lib/utils";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Minhas sugestões" };

type SuggestionStatus = Database["public"]["Enums"]["submission_status"];

// school_suggestions reaproveita o enum submission_status inteiro, mas só
// alcança um subconjunto de fato (DRAFT/UNDER_REVIEW/NEEDS_CORRECTION/
// ARCHIVED nunca são usados aqui -- ver SUGGESTION_QUEUE_FILTERABLE_STATUSES
// em lib/admin/school-suggestions.ts). Um rótulo cobrindo o enum inteiro
// evita quebrar se um valor inesperado aparecer.
const STATUS_LABEL: Record<SuggestionStatus, string> = {
  DRAFT: "Rascunho",
  SUBMITTED: "Em análise",
  UNDER_REVIEW: "Em análise",
  NEEDS_CORRECTION: "Precisa de correção",
  APPROVED: "Aceita",
  REJECTED: "Rejeitada",
  ARCHIVED: "Arquivada",
};

const STATUS_BADGE: Record<SuggestionStatus, BadgeProps["variant"]> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  NEEDS_CORRECTION: "danger",
  APPROVED: "success",
  REJECTED: "danger",
  ARCHIVED: "neutral",
};

export default async function MinhasSugestoesPage() {
  const suggestions = await getOwnSchoolSuggestions();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">Minhas sugestões</h1>
        <Button asChild size="sm" variant="outline">
          <Link href="/sugerir-escola">Sugerir escola</Link>
        </Button>
      </div>

      {suggestions.length === 0 ? (
        <EmptyState
          title="Nenhuma sugestão ainda"
          description="Não encontrou a escola que procurava? Sugira que ela seja adicionada."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/sugerir-escola">Sugerir escola</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id}>
              <CardHeader>
                <Badge variant={STATUS_BADGE[suggestion.status]} className="w-fit">
                  {STATUS_LABEL[suggestion.status]}
                </Badge>
                <CardTitle>{toDisplayCase(suggestion.name)}</CardTitle>
                <CardDescription>
                  {suggestion.municipality}, {suggestion.uf}
                </CardDescription>
                {suggestion.status === "REJECTED" && suggestion.rejectionReason && (
                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
                    <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {suggestion.rejectionReason}
                  </p>
                )}
                {suggestion.status === "APPROVED" && (
                  <p className="mt-2 text-sm text-neutral-600">
                    Aceita! A equipe ainda está cadastrando a escola por completo -- ela aparece na busca assim que
                    isso terminar.
                  </p>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
