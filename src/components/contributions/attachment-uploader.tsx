"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, FileText, Image as ImageIcon } from "lucide-react";

import { deleteAttachmentAction, type FormState } from "@/lib/contributions/actions";
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/contributions/constants";
import type { Database } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/auth/submit-button";
import { EmptyState } from "@/components/ui/empty-state";

type SubmissionAttachment = Database["public"]["Tables"]["submission_attachments"]["Row"];

const initialState: FormState = {};

export function AttachmentUploader({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!(ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Envie um PDF, JPG ou PNG.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setError("O arquivo deve ter no máximo 10MB.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    const body = new FormData();
    body.set("submission_id", submissionId);
    body.set("file", file);

    try {
      const response = await fetch("/api/contributions/attachments", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Não foi possível enviar o arquivo.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Não foi possível enviar o arquivo. Verifique sua conexão.");
    }

    setUploading(false);
    event.target.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
      <Button type="button" variant="outline" loading={uploading} onClick={() => inputRef.current?.click()}>
        <Upload className="size-4" aria-hidden="true" />
        {uploading ? "Enviando..." : "Enviar arquivo (PDF, JPG ou PNG, até 10MB)"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}

function DeleteAttachmentButton({ submissionId, attachmentId }: { submissionId: string; attachmentId: string }) {
  const [, formAction] = useActionState(deleteAttachmentAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="submission_id" value={submissionId} />
      <input type="hidden" name="attachment_id" value={attachmentId} />
      <SubmitButton variant="ghost" size="icon" aria-label="Remover anexo">
        <Trash2 className="size-4 text-danger-600" aria-hidden="true" />
      </SubmitButton>
    </form>
  );
}

export function AttachmentsList({
  submissionId,
  attachments,
}: {
  submissionId: string;
  attachments: SubmissionAttachment[];
}) {
  if (attachments.length === 0) {
    return (
      <EmptyState
        title="Nenhum anexo ainda"
        description="Anexar uma foto ou PDF da lista original é opcional, mas ajuda na moderação."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {attachments.map((attachment) => (
        <li
          key={attachment.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3"
        >
          <div className="flex items-center gap-2">
            {attachment.mime_type === "application/pdf" ? (
              <FileText className="size-5 shrink-0 text-neutral-400" aria-hidden="true" />
            ) : (
              <ImageIcon className="size-5 shrink-0 text-neutral-400" aria-hidden="true" />
            )}
            <span className="truncate text-sm text-neutral-900">{attachment.file_name}</span>
          </div>
          <DeleteAttachmentButton submissionId={submissionId} attachmentId={attachment.id} />
        </li>
      ))}
    </ul>
  );
}
