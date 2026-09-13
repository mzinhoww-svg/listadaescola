"use client";

import { useActionState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import {
  approveStoreClaimAction,
  rejectStoreClaimAction,
  type FormState,
} from "@/lib/admin/store-claim-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const initialState: FormState = {};

function ApproveForm({ claimId, isExistingStore }: { claimId: string; isExistingStore: boolean }) {
  const [state, formAction] = useActionState(approveStoreClaimAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="claim_id" value={claimId} />
      <p className="text-sm text-neutral-600">
        {isExistingStore
          ? "Aprovar dá a gestão da papelaria existente ao solicitante. Os dados atuais do cadastro não são sobrescritos — ele passa a poder editá-los pela área do gestor."
          : "Aprovar cria a papelaria já publicada, com os dados abaixo, e dá a gestão ao solicitante."}
      </p>
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton className="w-fit">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Aprovar solicitação
      </SubmitButton>
    </form>
  );
}

function RejectForm({ claimId }: { claimId: string }) {
  const [state, formAction] = useActionState(rejectStoreClaimAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="claim_id" value={claimId} />
      <label htmlFor="store-claim-reject-reason" className="text-sm font-medium text-neutral-900">
        Motivo da rejeição
      </label>
      <textarea
        id="store-claim-reject-reason"
        name="reason"
        required
        rows={2}
        maxLength={1000}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        placeholder="Ex.: não conseguimos confirmar que a papelaria é do solicitante; dados insuficientes..."
      />
      {state?.error && (
        <p role="alert" className="text-sm text-danger-600">
          {state.error}
        </p>
      )}
      <SubmitButton variant="danger" className="w-fit">
        <XCircle className="size-4" aria-hidden="true" />
        Rejeitar
      </SubmitButton>
    </form>
  );
}

export function StoreClaimModerationActions({
  claimId,
  status,
  isExistingStore,
}: {
  claimId: string;
  status: string;
  isExistingStore: boolean;
}) {
  if (status !== "SUBMITTED") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decisão</CardTitle>
        <CardDescription>
          O motivo é obrigatório para rejeitar — é ele que o solicitante vê. Toda decisão fica no log de
          auditoria.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ApproveForm claimId={claimId} isExistingStore={isExistingStore} />
        <hr className="border-neutral-200" />
        <RejectForm claimId={claimId} />
      </CardContent>
    </Card>
  );
}
