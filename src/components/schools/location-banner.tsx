"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LocationInput } from "@/components/location/location-input";
import { locationToResultsUrl } from "@/lib/schools/results-url";
import type { ResolvedLocation } from "@/lib/geocoding/types";

export interface LocationBannerProps {
  label: string | null;
  hasLocation: boolean;
}

/**
 * "Confirmação de localização" (Prompt 05 wireframe group A.2): shows the
 * location results are scoped to, with a way to change it without leaving
 * the results page. Error state (no location at all) also lives here --
 * it's the same affordance, just opened by default.
 */
export function LocationBanner({ label, hasLocation }: LocationBannerProps) {
  const router = useRouter();
  const [changing, setChanging] = React.useState(!hasLocation);

  function handleResolved(location: ResolvedLocation) {
    setChanging(false);
    router.push(locationToResultsUrl(location));
  }

  if (changing) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        {!hasLocation && (
          <p className="mb-3 text-sm text-neutral-600">
            Não encontramos uma localização para esta busca. Informe um CEP, cidade ou use sua localização atual.
          </p>
        )}
        <LocationInput
          onResolved={handleResolved}
          className="sm:items-end"
        />
        {hasLocation && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setChanging(false)}>
            Cancelar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <p className="flex items-center gap-2 text-sm text-neutral-700">
        <MapPin className="size-4 text-primary-600" aria-hidden="true" />
        Mostrando resultados perto de <strong className="font-medium">{label}</strong>
      </p>
      <Button variant="ghost" size="sm" onClick={() => setChanging(true)}>
        <Pencil className="size-3.5" aria-hidden="true" />
        Trocar localização
      </Button>
    </div>
  );
}
