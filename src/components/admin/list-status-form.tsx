"use client";

import { useActionState } from "react";
import { Archive, ArchiveRestore } from "lucide-react";

import { setListStatusAction, type FormState } from "@/lib/admin/list-actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

export function ListStatusForm({ schoolListId, status }: { schoolListId: string; status: string }) {
  const [state, formAction] = useActionState(setListStatusAction, initialState);
  const nextStatus = status === "APPROVED" ? "ARCHIVED" : "APPROVED";

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="school_list_id" value={schoolListId} />
      <input type="hidden" name="status" value={nextStatus} />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      {state?.success && <p className="text-sm text-success-600">{state.success}</p>}
      <SubmitButton variant={nextStatus === "ARCHIVED" ? "outline" : "primary"}>
        {nextStatus === "ARCHIVED" ? (
          <>
            <Archive className="size-4" aria-hidden="true" />
            Arquivar lista
          </>
        ) : (
          <>
            <ArchiveRestore className="size-4" aria-hidden="true" />
            Reativar lista
          </>
        )}
      </SubmitButton>
    </form>
  );
}
