import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, Image as ImageIcon, ChevronLeft } from "lucide-react";

import { getSubmissionModerationDetail } from "@/lib/moderation/detail";
import { ReviewActions } from "@/components/moderation/review-actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toDisplayCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Detalhe da submissão" };

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Enviada",
  UNDER_REVIEW: "Em revisão",
  NEEDS_CORRECTION: "Precisa de correção",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
};

// Same map as the queue page (moderacao/page.tsx) -- kept in sync
// manually since the two files don't share one, but must not drift back
// out of sync: this page previously rendered <Badge> with no variant at
// all, silently defaulting to neutral and losing exactly the color signal
// an admin uses to triage the queue at a glance.
const STATUS_BADGE: Record<string, BadgeProps["variant"]> = {
  SUBMITTED: "info",
  UNDER_REVIEW: "warning",
  NEEDS_CORRECTION: "danger",
  APPROVED: "success",
  REJECTED: "danger",
};

export default async function ModerationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const submission = await getSubmissionModerationDetail(id);
  if (!submission) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/moderacao" className="mb-2 flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Voltar para a fila
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[submission.status]}>{STATUS_LABEL[submission.status] ?? submission.status}</Badge>
        </div>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">{toDisplayCase(submission.school.name)}</h1>
        <p className="text-sm text-neutral-500">
          {submission.educationLevel} · {submission.seriesName} · {submission.schoolYear} ·{" "}
          {submission.school.municipality}/{submission.school.uf}
        </p>
        <p className="text-sm text-neutral-500">
          Enviado por {submission.submittedBy.fullName ?? "usuário sem nome"}
          {submission.reviewedBy && <> · em revisão por {submission.reviewedBy.fullName ?? "—"}</>}
        </p>
        {submission.status === "NEEDS_CORRECTION" && submission.correctionNotes && (
          <p className="mt-2 rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
            Correção solicitada: {submission.correctionNotes}
          </p>
        )}
        {submission.status === "REJECTED" && submission.rejectionReason && (
          <p className="mt-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
            Motivo da rejeição: {submission.rejectionReason}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Documento original</CardTitle>
            <CardDescription>Anexado pelo autor da submissão</CardDescription>
          </CardHeader>
          <CardContent>
            {submission.attachments.length === 0 ? (
              <EmptyState title="Sem anexo" description="O autor não enviou foto ou PDF da lista original." />
            ) : (
              <ul className="flex flex-col gap-3">
                {submission.attachments.map((attachment) => (
                  <li key={attachment.id} className="flex flex-col gap-2">
                    <span className="flex items-center gap-2 text-sm text-neutral-900">
                      {attachment.mimeType === "application/pdf" ? (
                        <FileText className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                      ) : (
                        <ImageIcon className="size-4 shrink-0 text-neutral-400" aria-hidden="true" />
                      )}
                      {attachment.fileName}
                    </span>
                    {attachment.signedUrl && attachment.mimeType !== "application/pdf" && (
                      // eslint-disable-next-line @next/next/no-img-element -- private, signed, short-lived URL; not an optimizable public asset
                      <img
                        src={attachment.signedUrl}
                        alt={`Anexo: ${attachment.fileName}`}
                        className="max-h-80 rounded-lg border border-neutral-200 object-contain"
                      />
                    )}
                    {attachment.signedUrl && attachment.mimeType === "application/pdf" && (
                      <a
                        href={attachment.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary-600 hover:underline"
                      >
                        Abrir PDF
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Dados submetidos</CardTitle>
            <CardDescription>{submission.items.length} itens digitados pelo autor</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-sm text-neutral-700">
              {submission.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <span>
                    {item.quantity}x {item.name}
                    {item.unit ? ` (${item.unit})` : ""}
                    {item.brand ? ` — ${item.brand}` : ""}
                  </span>
                  {!item.is_required && <Badge variant="neutral">opcional</Badge>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <ReviewActions submissionId={submission.id} status={submission.status} />
    </div>
  );
}
