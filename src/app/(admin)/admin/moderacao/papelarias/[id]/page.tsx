import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ChevronLeft } from "lucide-react";

import { getStoreClaimDetail } from "@/lib/admin/store-claims";
import { normalizeWhatsappNumber } from "@/lib/stores/whatsapp";
import { storeHref } from "@/lib/stores/store-profile";
import { StoreClaimModerationActions } from "@/components/stores/store-claim-moderation-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Detalhe da solicitação de papelaria" };

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Enviada",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
};

const STATUS_BADGE: Record<string, BadgeProps["variant"]> = {
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "danger",
};

/** O WhatsApp é gravado normalizado (55DDNNNNNNNNN) -- aqui só se devolve
 * a pontuação para leitura humana. */
function formatWhatsapp(value: string): string {
  const normalized = normalizeWhatsappNumber(value);
  if (!normalized) return value;
  const national = normalized.slice(2);
  const ddd = national.slice(0, 2);
  const rest = national.slice(2);
  const half = rest.length === 9 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, half)}-${rest.slice(half)}`;
}

export default async function StoreClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const claim = await getStoreClaimDetail(id);
  if (!claim) notFound();

  // Pendente + `linkedStore` = reivindicação de papelaria existente. Depois
  // de aprovada, `linkedStore` aponta para o resultado nos dois casos, e a
  // distinção deixa de ser uma decisão a tomar.
  const isExistingStore = claim.status === "SUBMITTED" && claim.linkedStore !== null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/moderacao/papelarias"
          className="mb-2 flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Voltar para solicitações
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_BADGE[claim.status]}>{STATUS_LABEL[claim.status] ?? claim.status}</Badge>
          <Badge variant={isExistingStore ? "warning" : "neutral"}>
            {isExistingStore ? "Reivindicação" : "Cadastro novo"}
          </Badge>
        </div>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">{claim.storeName}</h1>
        <p className="text-sm text-neutral-500">
          {claim.municipality}/{claim.uf}
        </p>
        <p className="text-sm text-neutral-500">
          Solicitado por {claim.requestedBy.fullName ?? "usuário sem nome"}
          {claim.reviewedBy && <> · revisado por {claim.reviewedBy.fullName ?? "—"}</>}
        </p>
        {claim.status === "REJECTED" && claim.rejectionReason && (
          <p className="mt-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
            Motivo da rejeição: {claim.rejectionReason}
          </p>
        )}
      </div>

      {normalizeWhatsappNumber(claim.whatsapp) === null && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          O número gravado não passa na validação de WhatsApp. Não deveria ser possível pelo formulário —
          investigue antes de aprovar.
        </p>
      )}

      {claim.linkedStore && (
        <Card>
          <CardHeader>
            <CardTitle as="h2">
              {claim.status === "SUBMITTED" ? "Papelaria reivindicada" : "Papelaria vinculada"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-900">
              {claim.linkedStore.name} — {claim.linkedStore.municipality}/{claim.linkedStore.uf}{" "}
              <Badge variant={claim.linkedStore.isActive ? "success" : "neutral"}>
                {claim.linkedStore.isActive ? "Ativa" : "Inativa"}
              </Badge>
            </p>
            {claim.linkedStore.isActive && (
              <Link href={storeHref(claim.linkedStore)} className="text-sm text-primary-700 hover:underline">
                Ver página pública
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle as="h2">Dados informados pelo solicitante</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">WhatsApp</dt>
              <dd className="text-neutral-900">{formatWhatsapp(claim.whatsapp)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Endereço</dt>
              <dd className="text-neutral-900">{claim.address ?? "não informado"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Horário</dt>
              <dd className="text-neutral-900">{claim.openingHours ?? "não informado"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Entrega / retirada</dt>
              <dd className="text-neutral-900">
                {claim.offersDelivery || claim.offersPickup
                  ? [claim.offersDelivery ? "Entrega" : null, claim.offersPickup ? "Retirada" : null]
                      .filter(Boolean)
                      .join(" · ")
                  : "nenhum dos dois"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-neutral-500">Serviços</dt>
              <dd className="text-neutral-900">
                {claim.services.length > 0 ? claim.services.join(" · ") : "nenhum informado"}
              </dd>
            </div>
            {claim.notes && (
              <div className="sm:col-span-2">
                <dt className="text-neutral-500">Observação do solicitante</dt>
                <dd className="whitespace-pre-line text-neutral-900">{claim.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <StoreClaimModerationActions claimId={claim.id} status={claim.status} isExistingStore={isExistingStore} />
    </div>
  );
}
