import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { getAdminSchoolDetail } from "@/lib/admin/schools";
import { SchoolEditForm } from "@/components/admin/school-edit-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Editar escola" };

export default async function AdminSchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const school = await getAdminSchoolDetail(id);
  if (!school) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/escolas" className="mb-2 flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Voltar para escolas
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={school.isActive ? "success" : "neutral"}>{school.isActive ? "Ativa" : "Inativa"}</Badge>
          {school.profile.isVerified && <Badge variant="info">Verificada</Badge>}
          {school.hasActiveCampaign && <Badge variant="sponsored">Patrocínio ativo</Badge>}
          {school.hasPublishedList && <Badge variant="secondary">Lista publicada</Badge>}
        </div>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">{school.name}</h1>
        <p className="text-sm text-neutral-500">
          {school.municipality}/{school.uf} · INEP {school.inepCode}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Dados INEP (fonte oficial, somente leitura)</CardTitle>
          <CardDescription>
            Atualizados apenas pela importação (Prompt 04) -- {school.source}. Endereço: {school.address ?? "não informado"}.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Perfil editorial</CardTitle>
          <CardDescription>Contato, descrição, verificação e visibilidade -- controlados pelo admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <SchoolEditForm school={school} />
        </CardContent>
      </Card>
    </div>
  );
}
