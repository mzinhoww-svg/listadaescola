"use client";

import * as React from "react";
import { MapPinOff } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

interface MapErrorBoundaryProps {
  children: React.ReactNode;
}

interface MapErrorBoundaryState {
  hasError: boolean;
}

/**
 * The map is a non-critical component (Prompt 05): if MapLibre fails to
 * load or render (network blocked, WebGL unavailable, tile provider
 * down), the rest of the page -- search, results list -- must keep
 * working. This catches render-time errors from <MapView> (including the
 * async-init error it rethrows during render) and swaps in a plain
 * empty state instead of crashing the page.
 */
export class MapErrorBoundary extends React.Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <EmptyState
          icon={MapPinOff}
          title="Mapa indisponível"
          description="Não foi possível carregar o mapa agora. A busca continua funcionando normalmente."
        />
      );
    }
    return this.props.children;
  }
}
