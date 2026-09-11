import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { getSchoolSuggestionDetail } from "@/lib/admin/school-suggestions";
import { SuggestionActions } from "@/components/admin/suggestion-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Detalhe da sugestão" };

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Enviada",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
};

export default async function SchoolSuggestionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const suggestion = await getSchoolSuggestionDetail(id);
  if (!suggestion) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/moderacao/sugestoes" className="mb-2 flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Voltar para sugestões
        </Link>
        <Badge>{STATUS_LABEL[suggestion.status] ?? suggestion.status}</Badge>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">{suggestion.name}</h1>
        <p className="text-sm text-neutral-500">
          {suggestion.municipality}/{suggestion.uf}
        </p>
        <p className="text-sm text-neutral-500">
          Sugerido por {suggestion.suggestedBy.fullName ?? "usuário sem nome"}
          {suggestion.reviewedBy && <> · revisado por {suggestion.reviewedBy.fullName ?? "—"}</>}
        </p>
        {suggestion.status === "REJECTED" && suggestion.rejectionReason && (
          <p className="mt-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
            Motivo da rejeição: {suggestion.rejectionReason}
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados sugeridos</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">Endereço</dt>
              <dd className="text-neutral-900">{suggestion.address ?? "não informado"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Telefone</dt>
              <dd className="text-neutral-900">{suggestion.phone ?? "não informado"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Tipo</dt>
              <dd className="text-neutral-900">{suggestion.schoolType ?? "não informado"}</dd>
            </div>
            {suggestion.notes && (
              <div className="sm:col-span-2">
                <dt className="text-neutral-500">Observações do autor</dt>
                <dd className="text-neutral-900">{suggestion.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <SuggestionActions suggestionId={suggestion.id} status={suggestion.status} />
    </div>
  );
}
