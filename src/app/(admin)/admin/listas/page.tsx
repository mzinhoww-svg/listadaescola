import type { Metadata } from "next";
import Link from "next/link";

import { getAdminLists } from "@/lib/admin/lists";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Listas" };

export default async function AdminListsPage() {
  const lists = await getAdminLists();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Listas</h1>
        <p className="text-sm text-neutral-500">
          Conteúdo (itens/versões) só entra via aprovação de submissão (Moderação) -- aqui dá pra revisar o que já
          existe e arquivar/reativar.
        </p>
      </div>

      {lists.length === 0 ? (
        <EmptyState title="Nenhuma lista ainda" description="Listas aparecem aqui depois da primeira aprovação em Moderação." />
      ) : (
        <Table>
          <TableCaption>Listas escolares publicadas</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Escola</TableHead>
              <TableHead>Série/Ano</TableHead>
              <TableHead>Versão atual</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lists.map((list) => (
              <TableRow key={list.id}>
                <TableCell>
                  <Link href={`/admin/listas/${list.id}`} className="font-medium text-primary-700 hover:underline">
                    {list.school.name}
                  </Link>
                  <div className="text-xs text-neutral-500">{list.school.municipality}</div>
                </TableCell>
                <TableCell>
                  {list.seriesName} · {list.schoolYear}
                </TableCell>
                <TableCell>{list.currentVersion ?? "—"}</TableCell>
                <TableCell>{list.itemCount}</TableCell>
                <TableCell>
                  <Badge variant={list.status === "APPROVED" ? "success" : "neutral"}>
                    {list.status === "APPROVED" ? "Publicada" : "Arquivada"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
