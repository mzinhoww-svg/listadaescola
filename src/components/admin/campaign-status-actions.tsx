"use client";

import { useActionState } from "react";

import { setCampaignStatusAction, type FormState } from "@/lib/admin/campaign-actions";
import type { CampaignStatus } from "@/lib/admin/campaigns";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: FormState = {};

function StatusButton({ campaignId, status, label, variant }: {
  campaignId: string;
  status: CampaignStatus;
  label: string;
  variant?: "primary" | "outline" | "danger";
}) {
  const [, formAction] = useActionState(setCampaignStatusAction, initialState);
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton variant={variant ?? "outline"} size="sm">
        {label}
      </SubmitButton>
    </form>
  );
}

export function CampaignStatusActions({ campaignId, status }: { campaignId: string; status: CampaignStatus }) {
  if (status === "ENDED") return <span className="text-sm text-neutral-400">—</span>;

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "SCHEDULED" || status === "PAUSED") && (
        <StatusButton campaignId={campaignId} status="ACTIVE" label={status === "PAUSED" ? "Retomar" : "Ativar agora"} variant="primary" />
      )}
      {status === "ACTIVE" && <StatusButton campaignId={campaignId} status="PAUSED" label="Pausar" />}
      <StatusButton campaignId={campaignId} status="ENDED" label="Encerrar" variant="danger" />
    </div>
  );
}
