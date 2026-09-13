import type { Metadata } from "next";
import Link from "next/link";

import { getManagedSchool, getManagedSchoolLists } from "@/lib/schools/manager";
import { PublishSchoolListForm } from "@/components/school-manager/publish-school-list-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { slugify } from "@/lib/utils";

export const metadata: Metadata = { title: "Listas da escola" };

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function MinhaEscolaListasPage() {
  const school = await getManagedSchool();
  if (!school) return null;

  const lists = await getManagedSchoolLists(school.id);
  const municipalitySlug = slugify(school.municipality);
  const identity = { id: school.id, slug: school.slug, uf: school.uf, municipalitySlug };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Listas de material</h1>
        <p className="max-w-[65ch] text-sm text-neutral-500">
          Como a escola é a fonte da própria lista, o que você publica aqui vai ao ar direto, sem passar pela
          fila de moderação. Toda publicação fica registrada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Publicar uma lista</CardTitle>
          <CardDescription>Escolha a série e o ano letivo e cole a lista como ela existe hoje.</CardDescription>
        </CardHeader>
        <CardContent>
          <PublishSchoolListForm school={identity} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Listas publicadas</CardTitle>
        </CardHeader>
        <CardContent>
          {lists.length === 0 ? (
            <EmptyState
              title="Nenhuma lista publicada ainda"
              description="Publique a primeira acima — ela aparece no perfil da escola na hora."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>Listas desta escola, mais recentes primeiro</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Série</TableHead>
                    <TableHead>Ano letivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Versões</TableHead>
                    <TableHead>Última publicação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lists.map((list) => (
                    <TableRow key={list.id}>
                      <TableCell>
                        {list.status === "APPROVED" ? (
                          <Link href={`/listas/${list.slug}`} className="font-medium text-primary-700 hover:underline">
                            {list.seriesName}
                          </Link>
                        ) : (
                          <span className="font-medium text-neutral-900">{list.seriesName}</span>
                        )}
                        <span className="block text-sm text-neutral-500">{list.educationLevel}</span>
                      </TableCell>
                      <TableCell>{list.schoolYear}</TableCell>
                      <TableCell>
                        {list.status === "APPROVED" ? (
                          <Badge variant="success">No ar</Badge>
                        ) : (
                          <Badge variant="neutral">Arquivada</Badge>
                        )}
                      </TableCell>
                      <TableCell>{list.versionCount}</TableCell>
                      <TableCell>{formatDate(list.lastPublishedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {lists.some((list) => list.status !== "APPROVED") && (
            <p className="mt-3 text-sm text-neutral-600">
              Uma lista arquivada foi retirada do ar pela nossa equipe e não aparece para as famílias.
              Publicá-la de novo a devolve ao ar com uma versão nova.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
