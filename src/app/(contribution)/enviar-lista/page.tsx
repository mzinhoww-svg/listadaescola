import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { getOwnDraftSubmissions } from "@/lib/contributions/queries";
import { NewSubmissionWizard } from "@/components/contributions/new-submission-wizard";
import { DiscardDraftButton } from "@/components/contributions/discard-draft-button";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toDisplayCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Enviar lista" };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  NEEDS_CORRECTION: "Precisa de correção",
};

const STEP_BY_STATUS: Record<string, string> = {
  DRAFT: "itens",
  NEEDS_CORRECTION: "itens",
};

export default async function EnviarListaPage() {
  const drafts = await getOwnDraftSubmissions();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold text-neutral-900">Enviar lista</h1>
      {drafts.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-neutral-900">Continuar envio</h2>
          {drafts.map((draft) => (
            <Card key={draft.id}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Badge variant={draft.status === "NEEDS_CORRECTION" ? "danger" : "neutral"}>
                    {STATUS_LABEL[draft.status] ?? draft.status}
                  </Badge>
                </div>
                {/* Série/ano promoted into the title line -- it's the only
                    thing that distinguishes two drafts for the same school
                    (e.g. a parent managing lists for two children), and it
                    used to sit in small gray text under an identical bold
                    school name on every card. */}
                <CardTitle>
                  {toDisplayCase(draft.school.name)} — {draft.seriesName}
                </CardTitle>
                <CardDescription>
                  {draft.educationLevel} · {draft.schoolYear}
                </CardDescription>
                {draft.status === "NEEDS_CORRECTION" && draft.correctionNotes && (
                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {draft.correctionNotes}
                  </p>
                )}
              </CardHeader>
              <CardFooter className="justify-between">
                <Button asChild size="sm">
                  <Link href={`/enviar-lista/${draft.id}/${STEP_BY_STATUS[draft.status] ?? "itens"}`}>
                    Continuar
                  </Link>
                </Button>
                {draft.status === "DRAFT" && <DiscardDraftButton submissionId={draft.id} />}
              </CardFooter>
            </Card>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">
          {drafts.length > 0 ? "Iniciar nova lista" : "Enviar lista escolar"}
        </h2>
        <NewSubmissionWizard />
      </section>
    </div>
  );
}
