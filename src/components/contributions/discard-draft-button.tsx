"use client";

import { useActionState, useEffect } from "react";
import { Trash2 } from "lucide-react";

import { discardDraftAction, type FormState } from "@/lib/contributions/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { useToast } from "@/components/ui/use-toast";

const initialState: FormState = {};

export function DiscardDraftButton({ submissionId }: { submissionId: string }) {
  const [state, formAction] = useActionState(discardDraftAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.success) toast({ title: state.success, variant: "success" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!confirm("Descartar este rascunho? Os itens e anexos serão perdidos.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="submission_id" value={submissionId} />
      <SubmitButton variant="ghost" size="sm">
        <Trash2 className="size-4" aria-hidden="true" />
        Descartar
      </SubmitButton>
    </form>
  );
}
