"use client";

import dynamic from "next/dynamic";

import { LoadingState } from "@/components/ui/loading-state";
import { MapErrorBoundary } from "@/components/map/map-error-boundary";
import type { MapViewProps } from "@/components/map/map-view";

const MapView = dynamic(() => import("@/components/map/map-view").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => <LoadingState label="Carregando mapa…" />,
});

/**
 * Public entry point for the map surface (MapProvider, Prompt 05).
 * Code-split (maplibre-gl only loads on pages that actually render a map)
 * and wrapped in an error boundary so a map failure never breaks the
 * page it's embedded in ("mapa é componente não crítico").
 */
export function Map(props: MapViewProps) {
  return (
    <MapErrorBoundary>
      <MapView {...props} />
    </MapErrorBoundary>
  );
}

export type { MapMarker, MapViewProps } from "@/components/map/map-view";
