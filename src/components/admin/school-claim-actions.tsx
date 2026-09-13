"use client";

import { useActionState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import {
  approveSchoolClaimAction,
  rejectSchoolClaimAction,
  type FormState,
} from "@/lib/admin/school-claim-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const initialState: FormState = {};

function ApproveForm({ claimId }: { claimId: string }) {
  const [state, formAction] = useActionState(approveSchoolClaimAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="claim_id" value={claimId} />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-sm text-success-600">
          {state.success}
        </p>
      )}
      <SubmitButton>
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Aprovar e dar acesso à escola
      </SubmitButton>
    </form>
  );
}

function RejectForm({ claimId }: { claimId: string }) {
  const [state, formAction] = useActionState(rejectSchoolClaimAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="claim_id" value={claimId} />
      <label htmlFor="claim-reject-reason" className="text-sm font-medium text-neutral-900">
        Motivo da rejeição
      </label>
      <textarea
        id="claim-reject-reason"
        name="reason"
        required
        rows={2}
        maxLength={1000}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        placeholder="Ex.: não conseguimos confirmar o vínculo pelo telefone da escola."
      />
      <p className="text-sm text-neutral-600">
        O solicitante lê este texto e pode enviar uma nova solicitação corrigida.
      </p>
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-sm text-success-600">
          {state.success}
        </p>
      )}
      <SubmitButton variant="danger">
        <XCircle className="size-4" aria-hidden="true" />
        Rejeitar
      </SubmitButton>
    </form>
  );
}

export function SchoolClaimActions({ claimId, status }: { claimId: string; status: string }) {
  if (status !== "SUBMITTED") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decisão</CardTitle>
        <CardDescription>
          Aprovar cria o vínculo em <code className="rounded bg-neutral-100 px-1">school_managers</code>, promove
          o perfil para SCHOOL_MANAGER (só se ainda for USER) e registra tudo no log de auditoria.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ApproveForm claimId={claimId} />
        <hr className="border-neutral-200" />
        <RejectForm claimId={claimId} />
      </CardContent>
    </Card>
  );
}
