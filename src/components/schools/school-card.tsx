import Link from "next/link";
import { MapPin, Star, ListChecks, BadgeCheck } from "lucide-react";

import { cn, slugify, toDisplayCase } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
 *
 * Onda 2 P4: o card inteiro é o alvo, via `after:absolute inset-0` no título.
 * Antes havia um "Ver escola" de 36px no rodapé -- abaixo dos 44px que o
 * DESIGN.md exige em mobile, repetido 20x por página -- e o `flex-1` que o
 * empurrava para baixo deixava 60px de vazio num card de 207px. Um alvo só,
 * do tamanho do card, resolve alvo de toque, espaço morto e altura de página
 * ao mesmo tempo.
 */
export function SchoolCard({ school, className }: SchoolCardProps) {
  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col transition-colors hover:border-primary-300 focus-within:border-primary-300",
        school.is_sponsored && "border-sponsored-300",
        className
      )}
    >
      <CardHeader>
        {school.is_sponsored && (
          <Badge variant="sponsored" className="mb-1 w-fit">
            PATROCINADA
          </Badge>
        )}
        <CardTitle className="line-clamp-2">
          <Link
            href={schoolHref(school)}
            className="rounded-lg after:absolute after:inset-0 group-hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            {toDisplayCase(school.name)}
          </Link>
        </CardTitle>
        <div className="flex items-center gap-1 text-sm text-neutral-500">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {school.municipality} - {school.uf}
            {school.distance_km !== null && ` · ${school.distance_km} km`}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
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
        {/*
          Onda 2 P3: antes isto só renderizava quando list_count > 0, então
          "sem lista" e "não sei" ficavam visualmente idênticos -- e com
          cobertura parcial esse é o estado da maioria. Dizer que não tem é
          informação; o silêncio não era.
        */}
        {school.list_count > 0 ? (
          <p className="flex items-center gap-1.5 text-sm text-neutral-600">
            <ListChecks className="size-4 text-primary-600" aria-hidden="true" />
            {school.list_count} {school.list_count === 1 ? "lista disponível" : "listas disponíveis"}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-neutral-500">
            <ListChecks className="size-4 text-neutral-400" aria-hidden="true" />
            Ainda sem lista
          </p>
        )}
      </CardContent>
    </Card>
  );
}
