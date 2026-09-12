import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { getOwnSubmissionDetail } from "@/lib/contributions/queries";
import { EDITABLE_SUBMISSION_STATUSES } from "@/lib/contributions/constants";
import { WizardSteps } from "@/components/contributions/wizard-steps";
import { AddItemForm, ItemsList } from "@/components/contributions/item-form";
import { Button } from "@/components/ui/button";
import { toDisplayCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Itens da lista" };

export default async function SubmissionItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const submission = await getOwnSubmissionDetail(id);
  if (!submission) notFound();
  if (!EDITABLE_SUBMISSION_STATUSES.includes(submission.status as (typeof EDITABLE_SUBMISSION_STATUSES)[number])) {
    redirect(`/enviar-lista/${id}/confirmacao`);
  }

  return (
    <div className="flex flex-col gap-6">
      <WizardSteps current="itens" />
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Itens da lista</h1>
        <p className="text-sm text-neutral-500">
          {toDisplayCase(submission.school.name)} · {submission.educationLevel} · {submission.seriesName} ·{" "}
          {submission.schoolYear}
        </p>
      </div>

      <AddItemForm submissionId={id} />
      <h2 className="text-base font-semibold text-neutral-900">Itens ({submission.items.length})</h2>
      <ItemsList submissionId={id} items={submission.items} />

      <div className="flex justify-end">
        {submission.items.length > 0 ? (
          <Button asChild>
            <Link href={`/enviar-lista/${id}/anexo`}>Continuar</Link>
          </Button>
        ) : (
          <Button disabled>Adicione ao menos um item para continuar</Button>
        )}
      </div>
    </div>
  );
}
