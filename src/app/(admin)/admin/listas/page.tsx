import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { getAdminLists } from "@/lib/admin/lists";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Listas" };

export default async function AdminListsPage() {
  const lists = await getAdminLists();

  return (
    <div className="flex flex-col gap-6">
      {/* Onda 4: esta descrição dizia "conteúdo só entra via aprovação de
          submissão (Moderação)". Deixou de ser verdade -- admin_publish_list
          dá o caminho direto, que era o gargalo do produto inteiro. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Listas</h1>
          <p className="max-w-[65ch] text-sm text-neutral-500">
            Publique direto em &quot;Nova lista&quot;, ou aprove uma contribuição em Moderação. Aqui dá
            pra revisar o que já existe e arquivar/reativar.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/listas/nova">
            <Plus className="size-4" aria-hidden="true" />
            Nova lista
          </Link>
        </Button>
      </div>

      {lists.length === 0 ? (
        <EmptyState
          title="Nenhuma lista ainda"
          description="Publique a primeira direto, sem esperar contribuição de ninguém."
          action={
            <Button asChild>
              <Link href="/admin/listas/nova">Publicar a primeira lista</Link>
            </Button>
          }
        />
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
