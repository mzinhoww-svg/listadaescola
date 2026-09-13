import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ExternalLink } from "lucide-react";

import { getSchoolClaimDetail } from "@/lib/admin/school-claims";
import { SchoolClaimActions } from "@/components/admin/school-claim-actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { contactTypeLabel, formatSchoolAddress } from "@/lib/schools/format";
import { slugify, toDisplayCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Reivindicação de escola" };

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Em análise",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
};

const STATUS_BADGE: Record<string, BadgeProps["variant"]> = {
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "danger",
};

const SCHOOL_TYPE_LABEL: Record<string, string> = { PUBLIC: "Pública", PRIVATE: "Privada" };

export default async function SchoolClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const claim = await getSchoolClaimDetail(id);
  if (!claim) notFound();

  const { school } = claim;
  const publicHref = `/escolas/${school.uf.toLowerCase()}/${slugify(school.municipality)}/${school.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/moderacao/reivindicacoes"
          className="mb-2 flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Voltar para reivindicações
        </Link>
        <Badge variant={STATUS_BADGE[claim.status] ?? "neutral"}>{STATUS_LABEL[claim.status] ?? claim.status}</Badge>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">{toDisplayCase(school.name)}</h1>
        <p className="text-sm text-neutral-500">
          Pedido por {claim.claimedBy.fullName ?? "usuário sem nome"} (papel atual: {claim.claimedBy.role})
          {claim.reviewedBy && <> · revisado por {claim.reviewedBy.fullName ?? "—"}</>}
        </p>
        {claim.status === "REJECTED" && claim.rejectionReason && (
          <p className="mt-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
            Motivo da rejeição: {claim.rejectionReason}
          </p>
        )}
      </div>

      {school.managers.length > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-warning-500 bg-warning-50 p-3 text-sm text-warning-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Esta escola já tem {school.managers.length === 1 ? "gestor" : "gestores"}:{" "}
            {school.managers.map((manager) => manager.fullName ?? "sem nome").join(", ")}. Aprovar adiciona mais
            uma pessoa com o mesmo poder, não substitui ninguém.
          </span>
        </p>
      )}

      {!school.isActive && (
        <p className="flex items-start gap-2 rounded-lg border border-danger-500 bg-danger-50 p-3 text-sm text-danger-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>Esta escola está inativa. A aprovação vai falhar até que ela volte a ficar ativa.</span>
        </p>
      )}

      {/* Lado a lado: a declaração (esquerda) contra o que o INEP e o
          cadastro já dizem (direita). É literalmente o critério de decisão
          -- não há sinal automático a conferir. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2">O que a pessoa declarou</CardTitle>
            <CardDescription>Texto livre, escrito por quem pediu. Nada aqui foi verificado.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-neutral-500">Nome declarado</dt>
                <dd className="text-neutral-900">{claim.claimantName}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Cargo / vínculo</dt>
                <dd className="text-neutral-900">{claim.claimantRole}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Contato institucional informado</dt>
                <dd className="font-medium text-neutral-900">{claim.institutionalContact}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Justificativa</dt>
                <dd className="whitespace-pre-line text-neutral-900">{claim.justification}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Conta</dt>
                <dd className="text-neutral-900">{claim.claimedBy.fullName ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">O que a base já diz (INEP)</CardTitle>
            <CardDescription>Fonte oficial — é contra isto que a declaração se compara.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-neutral-500">Nome oficial</dt>
                <dd className="text-neutral-900">{school.name}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Código INEP</dt>
                <dd className="text-neutral-900">{school.inepCode}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Endereço</dt>
                <dd className="text-neutral-900">
                  {formatSchoolAddress(school.address, school.municipality, school.uf)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Telefone (INEP)</dt>
                <dd className="font-medium text-neutral-900">{school.phone ?? "não informado"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Tipo / dependência</dt>
                <dd className="text-neutral-900">
                  {SCHOOL_TYPE_LABEL[school.schoolType] ?? school.schoolType}
                  {school.administrativeDependency ? ` · ${school.administrativeDependency}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Contatos cadastrados</dt>
                <dd className="text-neutral-900">
                  {school.contacts.length > 0 ? (
                    <ul className="flex flex-col gap-1">
                      {school.contacts.map((contact) => (
                        <li key={contact.id}>
                          <span className="text-neutral-500">{contactTypeLabel(contact.contactType)}:</span>{" "}
                          {contact.value}
                          {!contact.isPublic && " (interno)"}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "nenhum"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Perfil editorial</dt>
                <dd className="text-neutral-900">
                  {school.profile?.website ?? "sem site"}
                  {school.profile?.whatsapp ? ` · WhatsApp ${school.profile.whatsapp}` : ""}
                  {school.profile?.instagram ? ` · ${school.profile.instagram}` : ""}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/admin/escolas/${school.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
              >
                Abrir no CRUD de escolas
              </Link>
              <Link
                href={publicHref}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
              >
                Ver perfil público
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <SchoolClaimActions claimId={claim.id} status={claim.status} />
    </div>
  );
}
