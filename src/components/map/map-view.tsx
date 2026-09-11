"use client";

import * as React from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { buildMapStyle, getMapTileConfig } from "@/lib/map/config";

export interface MapMarker {
  id: string;
  lat: number;
  lon: number;
  label?: string;
}

export interface MapViewProps {
  center: { lat: number; lon: number };
  zoom?: number;
  markers?: MapMarker[];
  onMarkerClick?: (id: string) => void;
  className?: string;
  height?: number | string;
}

/**
 * MapLibre implementation of the map surface. Loaded only through
 * `Map` (map.tsx), which lazy-imports this component and wraps it in an
 * error boundary -- the map is a non-critical component per Prompt 05
 * ("se falhar, busca continua funcional"), so failures here must never
 * take down the page that embeds it.
 *
 * maplibre-gl itself is imported dynamically inside the effect (not at
 * module scope) so nothing here touches the DOM/WebGL during SSR.
 */
export function MapView({ center, zoom = 13, markers = [], onMarkerClick, className, height = 320 }: MapViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<MapLibreMap | null>(null);
  const markersRef = React.useRef<MapLibreMarker[]>([]);
  const [initError, setInitError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const maplibregl = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;

        const config = getMapTileConfig();
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: buildMapStyle(config),
          center: [center.lon, center.lat],
          zoom,
          attributionControl: false,
        });
        // Style/tile load failures (bad style URL, tile host down, ...)
        // surface as an 'error' event, not a thrown exception -- without
        // this, a broken provider would silently show a blank map instead
        // of the "mapa indisponível" fallback.
        map.once("error", (event) => {
          if (cancelled) return;
          setInitError(event.error instanceof Error ? event.error : new Error("Falha ao carregar o mapa"));
        });
        map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        mapRef.current = map;
      } catch (err) {
        if (!cancelled) setInitError(err instanceof Error ? err : new Error("Falha ao inicializar o mapa"));
      }
    }

    init();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Only re-init on mount; center/zoom updates below re-target the same map instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    mapRef.current?.setCenter([center.lon, center.lat]);
  }, [center.lat, center.lon]);

  React.useEffect(() => {
    let cancelled = false;

    async function syncMarkers() {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !mapRef.current) return;
      const map = mapRef.current;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = markers.map((markerData) => {
        const marker = new maplibregl.Marker().setLngLat([markerData.lon, markerData.lat]).addTo(map);
        if (markerData.label) {
          marker.setPopup(new maplibregl.Popup({ offset: 24 }).setText(markerData.label));
        }
        if (onMarkerClick) {
          const el = marker.getElement();
          el.style.cursor = "pointer";
          el.addEventListener("click", () => onMarkerClick(markerData.id));
        }
        return marker;
      });
    }

    syncMarkers();

    return () => {
      cancelled = true;
    };
  }, [markers, onMarkerClick]);

  // React error boundaries don't catch errors from async effects -- surface
  // it during render so the MapErrorBoundary around <Map> can catch it.
  if (initError) throw initError;

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Mapa"
      className={className}
      style={{ height, width: "100%" }}
    />
  );
}
