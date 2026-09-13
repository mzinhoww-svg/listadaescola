import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Clock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getOwnClaimForSchool } from "@/lib/schools/claims";
import { ClaimSchoolForm } from "@/components/school-manager/claim-school-form";
import { ClaimSchoolPicker } from "@/components/school-manager/claim-school-picker";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatSchoolAddress } from "@/lib/schools/format";
import { toDisplayCase } from "@/lib/utils";

export const metadata: Metadata = { title: "Reivindicar escola" };

// Depende de sessão e de Supabase em tempo de request.
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ escola?: string }>;
}

export default async function ReivindicarEscolaPage({ searchParams }: PageProps) {
  const { escola } = await searchParams;
  const profile = await getCurrentProfile();

  if (!escola) {
    return (
      <Card>
        <CardHeader>
          <CardTitle as="h1">Qual é a sua escola?</CardTitle>
          <CardDescription>
            Encontre a escola na base do INEP para pedir acesso ao perfil dela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClaimSchoolPicker />
        </CardContent>
      </Card>
    );
  }

  const supabase = await createClient();
  const { data: school } = await supabase
    .from("schools")
    .select("id, name, slug, uf, municipality, address, inep_code")
    .eq("id", escola)
    .eq("is_active", true)
    .maybeSingle();

  if (!school) {
    return (
      <EmptyState
        title="Escola não encontrada"
        description="Ela pode ter saído do ar ou o link estar incorreto."
        action={
          <Button asChild variant="outline">
            <Link href="/reivindicar-escola">Buscar outra escola</Link>
          </Button>
        }
      />
    );
  }

  // Já gerencia esta escola: não faz sentido pedir de novo.
  const { data: existingManager } = await supabase
    .from("school_managers")
    .select("id")
    .eq("school_id", school.id)
    .eq("profile_id", profile?.id ?? "")
    .maybeSingle();
  if (existingManager) redirect("/minha-escola");

  const ownClaim = await getOwnClaimForSchool(school.id);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle as="h1">{toDisplayCase(school.name)}</CardTitle>
          <CardDescription>
            {formatSchoolAddress(school.address, school.municipality, school.uf)} · INEP {school.inep_code}
          </CardDescription>
        </CardHeader>
      </Card>

      {ownClaim?.status === "SUBMITTED" ? (
        <EmptyState
          icon={Clock}
          title="Sua solicitação está em análise"
          description="Nossa equipe confere os dados com a escola antes de liberar o acesso. Você recebe a resposta em Minha escola."
          action={
            <Button asChild variant="outline">
              <Link href="/minha-escola">Ver minha solicitação</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle as="h2">É a sua escola?</CardTitle>
            <CardDescription>
              Peça acesso para manter o perfil e publicar as listas de material direto, sem passar pela fila
              de moderação.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {ownClaim?.status === "REJECTED" && ownClaim.rejectionReason && (
              <p className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
                Sua solicitação anterior não foi aprovada: {ownClaim.rejectionReason} Você pode enviar outra
                com as informações corrigidas.
              </p>
            )}
            <p className="flex items-start gap-2 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary-600" aria-hidden="true" />
              <span>
                Não existe verificação automática: uma pessoa da nossa equipe confere sua declaração com os
                dados oficiais da escola. Nome, código INEP e endereço continuam vindo do INEP e não podem ser
                editados por aqui.
              </span>
            </p>
            <ClaimSchoolForm schoolId={school.id} defaultName={profile?.full_name ?? undefined} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
