import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { getOwnSubmissionDetail } from "@/lib/contributions/queries";
import { EDITABLE_SUBMISSION_STATUSES } from "@/lib/contributions/constants";
import { WizardSteps } from "@/components/contributions/wizard-steps";
import { AttachmentUploader, AttachmentsList } from "@/components/contributions/attachment-uploader";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Anexo da lista" };

export default async function SubmissionAttachmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rascunho?: string }>;
}) {
  const { id } = await params;
  const { rascunho } = await searchParams;
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

      {/* Colisão com DRAFT remoto (spec 2026-09-13-cta-home-rascunho-anonimo):
          rascunho local venceu e substituiu os itens de um rascunho
          remoto pra mesma escola/série/ano -- aviso não bloqueante, não
          uma escolha. */}
      {rascunho === "atualizado" && (
        <p className="rounded-lg bg-info-50 p-3 text-sm text-info-700">
          Atualizamos seu rascunho anterior desta lista com o que você acabou de preencher.
        </p>
      )}

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
