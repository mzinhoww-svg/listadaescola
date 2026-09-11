import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { getOwnSubmissionDetail } from "@/lib/contributions/queries";
import { EDITABLE_SUBMISSION_STATUSES } from "@/lib/contributions/constants";
import { WizardSteps } from "@/components/contributions/wizard-steps";
import { AttachmentUploader, AttachmentsList } from "@/components/contributions/attachment-uploader";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Anexo da lista" };

export default async function SubmissionAttachmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const submission = await getOwnSubmissionDetail(id);
  if (!submission) notFound();
  if (!EDITABLE_SUBMISSION_STATUSES.includes(submission.status as (typeof EDITABLE_SUBMISSION_STATUSES)[number])) {
    redirect(`/enviar-lista/${id}/confirmacao`);
  }

  return (
    <div className="flex flex-col gap-6">
      <WizardSteps current="anexo" />
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Anexar a lista original</h1>
        <p className="text-sm text-neutral-500">
          Opcional, mas uma foto ou PDF da lista oficial ajuda bastante na moderação.
        </p>
      </div>

      <AttachmentUploader submissionId={id} />
      <AttachmentsList submissionId={id} attachments={submission.attachments} />

      <div className="flex justify-between">
        <Button asChild variant="outline">
          <Link href={`/enviar-lista/${id}/itens`}>Voltar</Link>
        </Button>
        <Button asChild>
          <Link href={`/enviar-lista/${id}/revisao`}>Continuar</Link>
        </Button>
      </div>
    </div>
  );
}
