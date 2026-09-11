import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle, PartyPopper } from "lucide-react";

import { getOwnSubmissionDetail } from "@/lib/contributions/queries";
import { EDITABLE_SUBMISSION_STATUSES } from "@/lib/contributions/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Status do envio" };

const STATUS_CONTENT: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; iconClass: string; title: string; description: string }
> = {
  SUBMITTED: {
    icon: CheckCircle2,
    iconClass: "text-success-600",
    title: "Lista enviada!",
    description: "Sua lista foi enviada para moderação. Você será avisado quando ela for revisada.",
  },
  UNDER_REVIEW: {
    icon: Clock,
    iconClass: "text-info-600",
    title: "Em análise",
    description: "Nossa equipe está revisando sua lista agora.",
  },
  APPROVED: {
    icon: PartyPopper,
    iconClass: "text-success-600",
    title: "Lista aprovada!",
    description: "Sua lista foi aprovada e já está publicada. Obrigado por contribuir!",
  },
  REJECTED: {
    icon: XCircle,
    iconClass: "text-danger-600",
    title: "Lista não aprovada",
    description: "Sua lista não foi aprovada desta vez.",
  },
  ARCHIVED: {
    icon: Clock,
    iconClass: "text-neutral-400",
    title: "Envio arquivado",
    description: "Este envio não está mais ativo.",
  },
};

export default async function SubmissionConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const submission = await getOwnSubmissionDetail(id);
  if (!submission) notFound();
  if (EDITABLE_SUBMISSION_STATUSES.includes(submission.status as (typeof EDITABLE_SUBMISSION_STATUSES)[number])) {
    redirect(`/enviar-lista/${id}/itens`);
  }

  const content = STATUS_CONTENT[submission.status] ?? STATUS_CONTENT.SUBMITTED;
  const Icon = content.icon;

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <Icon className={`size-12 ${content.iconClass}`} aria-hidden="true" />
        <h1 className="text-lg font-semibold text-neutral-900">{content.title}</h1>
        <p className="max-w-sm text-sm text-neutral-500">{content.description}</p>
        {submission.status === "REJECTED" && submission.rejectionReason && (
          <p className="max-w-sm rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
            {submission.rejectionReason}
          </p>
        )}
        <p className="text-sm text-neutral-500">
          {submission.school.name} · {submission.educationLevel} · {submission.seriesName} · {submission.schoolYear}
        </p>
        <Button asChild className="mt-2">
          <Link href="/enviar-lista">Voltar</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
