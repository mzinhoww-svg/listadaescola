import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";

import { getReviewModerationQueue } from "@/lib/admin/reviews";
import { ReviewModerationActions } from "@/components/admin/review-moderation-actions";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Avaliações" };

export default async function ReviewModerationPage() {
  const queue = await getReviewModerationQueue();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/moderacao" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← Fila de listas
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900">Avaliações pendentes</h1>
      </div>

      {queue.length === 0 ? (
        <EmptyState title="Nada por aqui" description="Nenhuma avaliação aguardando moderação." />
      ) : (
        <Table>
          <TableCaption>Fila de moderação de avaliações de escola</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Nota</TableHead>
              <TableHead>Comentário</TableHead>
              <TableHead>Escola</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-4 text-warning-500" aria-hidden="true" />
                    {item.rating}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs">
                  {item.comment ?? <span className="text-neutral-500">—</span>}
                </TableCell>
                <TableCell>
                  {item.school.name}
                  <span className="block text-sm text-neutral-500">
                    {item.school.municipality}/{item.school.uf}
                  </span>
                </TableCell>
                <TableCell>{item.author.fullName ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <ReviewModerationActions reviewId={item.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
