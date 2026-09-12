import Link from "next/link";
import { MapPin, Star, ListChecks, BadgeCheck } from "lucide-react";

import { cn, slugify, toDisplayCase } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SchoolResult } from "@/lib/schools/search-schools";

export function schoolHref(school: Pick<SchoolResult, "uf" | "municipality" | "slug">): string {
  return `/escolas/${school.uf.toLowerCase()}/${slugify(school.municipality)}/${school.slug}`;
}

export interface SchoolCardProps {
  school: SchoolResult;
  className?: string;
}

/**
 * Reused by Home ("destaques") and Resultados. Relevância/avaliação and
 * patrocínio are always shown as visually distinct signals (PRD RF-003) --
 * PATROCINADA never replaces or is mixed into the rating/relevance shown.
 */
export function SchoolCard({ school, className }: SchoolCardProps) {
  return (
    <Card className={cn("flex h-full flex-col", school.is_sponsored && "border-sponsored-300", className)}>
      <CardHeader>
        {school.is_sponsored && (
          <Badge variant="sponsored" className="mb-1 w-fit">
            PATROCINADA
          </Badge>
        )}
        <CardTitle className="line-clamp-2">{toDisplayCase(school.name)}</CardTitle>
        <div className="flex items-center gap-1 text-sm text-neutral-500">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {school.municipality} - {school.uf}
            {school.distance_km !== null && ` · ${school.distance_km} km`}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={school.school_type === "PUBLIC" ? "info" : "neutral"}>
            {school.school_type === "PUBLIC" ? "Pública" : "Privada"}
          </Badge>
          {school.is_verified && (
            <Badge variant="success">
              <BadgeCheck className="size-3" aria-hidden="true" />
              Verificada
            </Badge>
          )}
          {school.review_count > 0 && (
            <Badge variant="neutral">
              <Star className="size-3" aria-hidden="true" />
              {Number(school.avg_rating).toFixed(1)} ({school.review_count})
            </Badge>
          )}
        </div>
        {school.list_count > 0 && (
          <p className="flex items-center gap-1.5 text-sm text-neutral-600">
            <ListChecks className="size-4 text-primary-600" aria-hidden="true" />
            {school.list_count} {school.list_count === 1 ? "lista disponível" : "listas disponíveis"}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Link
          href={schoolHref(school)}
          className="w-full rounded-lg py-2 text-center text-sm font-medium text-primary-700 hover:bg-primary-50"
        >
          Ver escola
        </Link>
      </CardFooter>
    </Card>
  );
}
