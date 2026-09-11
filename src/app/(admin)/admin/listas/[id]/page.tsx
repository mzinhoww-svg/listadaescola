import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { getAdminListDetail } from "@/lib/admin/lists";
import { ListStatusForm } from "@/components/admin/list-status-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Detalhe da lista" };

export default async function AdminListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const list = await getAdminListDetail(id);
  if (!list) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/listas" className="mb-2 flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Voltar para listas
        </Link>
        <Badge variant={list.status === "APPROVED" ? "success" : "neutral"}>
          {list.status === "APPROVED" ? "Publicada" : "Arquivada"}
        </Badge>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">{list.school.name}</h1>
        <p className="text-sm text-neutral-500">
          {list.seriesName} · {list.schoolYear} · {list.school.municipality}/{list.school.uf}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Ação</CardTitle>
          <CardDescription>Arquivar não apaga versões anteriores (RN-006/RN-007).</CardDescription>
        </CardHeader>
        <CardContent>
          <ListStatusForm schoolListId={list.id} status={list.status} />
        </CardContent>
      </Card>

      {list.versions.map((version) => (
        <Card key={version.id}>
          <CardHeader>
            <CardTitle as="h2">
              Versão {version.versionNumber} <Badge variant={version.status === "PUBLISHED" ? "success" : "neutral"}>{version.status}</Badge>
            </CardTitle>
            <CardDescription>Publicada em {new Date(version.publishedAt).toLocaleDateString("pt-BR")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-sm text-neutral-700">
              {version.items.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <span>
                    {item.quantity}x {item.name}
                    {item.unit ? ` (${item.unit})` : ""}
                    {item.brand ? ` — ${item.brand}` : ""}
                  </span>
                  {!item.isRequired && <Badge variant="neutral">opcional</Badge>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
