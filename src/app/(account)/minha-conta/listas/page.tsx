import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, XCircle } from "lucide-react";

import { getOwnSubmissions } from "@/lib/contributions/queries";
import { schoolHref } from "@/components/schools/school-card";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Minhas listas" };

type SubmissionStatus = Database["public"]["Enums"]["submission_status"];

const TABS: { key: string; label: string; statuses?: SubmissionStatus[] }[] = [
  { key: "todas", label: "Todas" },
  { key: "rascunhos", label: "Rascunhos", statuses: ["DRAFT"] },
  { key: "em-analise", label: "Em análise", statuses: ["SUBMITTED", "UNDER_REVIEW"] },
  { key: "precisa-correcao", label: "Precisa de correção", statuses: ["NEEDS_CORRECTION"] },
  { key: "publicadas", label: "Publicadas", statuses: ["APPROVED"] },
  { key: "rejeitadas", label: "Rejeitadas", statuses: ["REJECTED"] },
];

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  DRAFT: "Rascunho",
  SUBMITTED: "Enviada",
  UNDER_REVIEW: "Em revisão",
  NEEDS_CORRECTION: "Precisa de correção",
  APPROVED: "Publicada",
  REJECTED: "Rejeitada",
  ARCHIVED: "Arquivada",
};

const STATUS_BADGE: Record<SubmissionStatus, BadgeProps["variant"]> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  UNDER_REVIEW: "warning",
  NEEDS_CORRECTION: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  ARCHIVED: "neutral",
};

const CONTINUABLE: SubmissionStatus[] = ["DRAFT", "NEEDS_CORRECTION"];

interface MinhasListasPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function MinhasListasPage({ searchParams }: MinhasListasPageProps) {
  const { tab: tabParam } = await searchParams;
  const activeTab = TABS.find((tab) => tab.key === tabParam) ?? TABS[0];
  const submissions = await getOwnSubmissions(activeTab.statuses);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Minhas listas</h1>

      <nav aria-label="Filtrar por status" className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "todas" ? "/minha-conta/listas" : `/minha-conta/listas?tab=${tab.key}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              activeTab.key === tab.key
                ? "bg-primary-600 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {submissions.length === 0 ? (
        <EmptyState title="Nada por aqui" description="Nenhuma lista enviada neste filtro." />
      ) : (
        <div className="flex flex-col gap-3">
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader>
                <Badge variant={STATUS_BADGE[submission.status]} className="w-fit">
                  {STATUS_LABEL[submission.status]}
                </Badge>
                <CardTitle>{submission.school.name}</CardTitle>
                <CardDescription>
                  {submission.educationLevel} · {submission.seriesName} · {submission.schoolYear} ·{" "}
                  {submission.school.municipality}
                </CardDescription>
                {submission.status === "NEEDS_CORRECTION" && submission.correctionNotes && (
                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {submission.correctionNotes}
                  </p>
                )}
                {submission.status === "REJECTED" && submission.rejectionReason && (
                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
                    <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {submission.rejectionReason}
                  </p>
                )}
              </CardHeader>
              {(CONTINUABLE.includes(submission.status) || submission.status === "APPROVED") && (
                <CardFooter>
                  {CONTINUABLE.includes(submission.status) ? (
                    <Button asChild size="sm">
                      <Link href={`/enviar-lista/${submission.id}/itens`}>Continuar</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link href={schoolHref(submission.school)}>Ver na escola</Link>
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
