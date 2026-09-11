import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FileText, Image as ImageIcon } from "lucide-react";

import { getOwnSubmissionDetail } from "@/lib/contributions/queries";
import { EDITABLE_SUBMISSION_STATUSES } from "@/lib/contributions/constants";
import { WizardSteps } from "@/components/contributions/wizard-steps";
import { SubmitReviewForm } from "@/components/contributions/submit-review-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Revisar lista" };

export default async function SubmissionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const submission = await getOwnSubmissionDetail(id);
  if (!submission) notFound();
  if (!EDITABLE_SUBMISSION_STATUSES.includes(submission.status as (typeof EDITABLE_SUBMISSION_STATUSES)[number])) {
    redirect(`/enviar-lista/${id}/confirmacao`);
  }

  return (
    <div className="flex flex-col gap-6">
      <WizardSteps current="revisao" />
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Revisar e enviar</h1>
        <p className="text-sm text-neutral-500">Confira os dados antes de enviar para moderação.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{submission.school.name}</CardTitle>
          <CardDescription>
            {submission.educationLevel} · {submission.seriesName} · {submission.schoolYear}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-neutral-900">Itens ({submission.items.length})</h2>
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
          </div>

          {submission.attachments.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-neutral-900">
                Anexos ({submission.attachments.length})
              </h2>
              <ul className="flex flex-col gap-1.5 text-sm text-neutral-700">
                {submission.attachments.map((attachment) => (
                  <li key={attachment.id} className="flex items-center gap-2">
                    {attachment.mime_type === "application/pdf" ? (
                      <FileText className="size-4 text-neutral-400" aria-hidden="true" />
                    ) : (
                      <ImageIcon className="size-4 text-neutral-400" aria-hidden="true" />
                    )}
                    {attachment.file_name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <SubmitReviewForm submissionId={id} />
    </div>
  );
}
