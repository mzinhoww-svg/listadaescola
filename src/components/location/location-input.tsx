"use client";

import * as React from "react";
import { LocateFixed, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { resolveLocationByCoordsAction, resolveLocationByTextAction } from "@/lib/geocoding/resolve-location";
import type { ResolvedLocation } from "@/lib/geocoding/types";

export interface LocationInputProps {
  /** State to scope the search to (RN/expansão futura) -- defaults to the current MVP scope. */
  uf?: string;
  onResolved: (location: ResolvedLocation) => void;
  className?: string;
}

/**
 * Accepts CEP, cidade/bairro (free text) or "localizar-me" (browser
 * geolocation) per Prompt 05. Purely presentational/composable: it never
 * decides what to do with a resolved location, only reports it via
 * `onResolved` -- Prompt 06 wires this into Home/Busca/Resultados.
 */
export function LocationInput({ uf = "MT", onResolved, className }: LocationInputProps) {
  const [query, setQuery] = React.useState("");
  const [isResolving, setIsResolving] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const { toast } = useToast();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || isResolving) return;

    setIsResolving(true);
    try {
      const resolved = await resolveLocationByTextAction(query, uf);
      if (resolved.source === "unresolved") {
        toast({
          variant: "danger",
          title: "Não encontramos essa localização",
          description: "Tente um CEP ou o nome de uma cidade de Mato Grosso.",
        });
        return;
      }
      onResolved(resolved);
    } finally {
      setIsResolving(false);
    }
  }

  function handleLocateMe() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      toast({
        variant: "danger",
        title: "Geolocalização indisponível",
        description: "Seu navegador não oferece suporte a essa função. Digite um CEP ou cidade.",
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const resolved = await resolveLocationByCoordsAction(
            position.coords.latitude,
            position.coords.longitude
          );
          onResolved(resolved);
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        toast({
          variant: "danger",
          title: "Não foi possível obter sua localização",
          description: "Permita o acesso à localização no navegador ou digite um CEP/cidade.",
        });
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-3 sm:flex-row sm:items-end", className)}>
      <div className="flex-1">
        <Input
          label="CEP ou cidade"
          placeholder="Ex.: 78000-000 ou Cuiabá"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="lg" loading={isResolving}>
          <Search className="size-4" aria-hidden="true" />
          Buscar
        </Button>
        <Button type="button" variant="outline" size="lg" loading={isLocating} onClick={handleLocateMe}>
          <LocateFixed className="size-4" aria-hidden="true" />
          Usar minha localização
        </Button>
      </div>
    </form>
  );
}
