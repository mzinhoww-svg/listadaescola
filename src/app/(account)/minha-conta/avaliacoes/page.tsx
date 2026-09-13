import type { Metadata } from "next";
import Link from "next/link";
import { Star, XCircle } from "lucide-react";

import { getOwnReviews } from "@/lib/reviews/queries";
import { schoolHref } from "@/components/schools/school-card";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, toDisplayCase } from "@/lib/utils";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Minhas avaliações" };

type ReviewStatus = Database["public"]["Enums"]["review_status"];

const STATUS_LABEL: Record<ReviewStatus, string> = {
  PENDING: "Em análise",
  APPROVED: "Publicada",
  REJECTED: "Rejeitada",
};

const STATUS_BADGE: Record<ReviewStatus, BadgeProps["variant"]> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export default async function MinhasAvaliacoesPage() {
  const reviews = await getOwnReviews();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Minhas avaliações</h1>

      {reviews.length === 0 ? (
        <EmptyState title="Nenhuma avaliação ainda" description="Avalie uma escola para vê-la aqui." />
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <Badge variant={STATUS_BADGE[review.status]} className="w-fit">
                  {STATUS_LABEL[review.status]}
                </Badge>
                <CardTitle>
                  <Link href={schoolHref(review.school)} className="hover:underline">
                    {toDisplayCase(review.school.name)}
                  </Link>
                </CardTitle>
                <CardDescription>{review.school.municipality}</CardDescription>
                <div className="mt-1 flex items-center gap-0.5 text-warning-500" aria-label={`Nota ${review.rating} de 5`}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={cn("size-4", index < review.rating ? "fill-current" : "text-neutral-300")}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                {review.comment && <p className="mt-2 text-sm text-neutral-700">{review.comment}</p>}
                {review.status === "REJECTED" && review.rejectionReason && (
                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
                    <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {review.rejectionReason}
                  </p>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
