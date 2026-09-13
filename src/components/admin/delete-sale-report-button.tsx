"use client";

import { useActionState, useEffect } from "react";
import { Trash2 } from "lucide-react";

import type { FormState } from "@/lib/admin/sales-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { useToast } from "@/components/ui/use-toast";

const initialState: FormState = {};

export function DeleteSaleReportButton({
  action,
  reportId,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  reportId: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.success) toast({ title: state.success, variant: "success" });
    if (state?.error) toast({ title: state.error, variant: "danger" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!confirm("Excluir este registro de venda? Essa ação não pode ser desfeita.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={reportId} />
      <SubmitButton variant="ghost" size="icon" aria-label="Excluir registro">
        <Trash2 className="size-4 text-danger-600" aria-hidden="true" />
      </SubmitButton>
    </form>
  );
}
