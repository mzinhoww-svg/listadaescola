import type { StyleSpecification } from "maplibre-gl";

/**
 * Tile provider is configurable/substitutable (Prompt 05): set
 * NEXT_PUBLIC_MAP_STYLE_URL to a full vector style (e.g. a keyed
 * OSM-derived provider like MapTiler/Stadia/Protomaps) to replace the
 * default entirely, or override just the raster tile template/attribution
 * to point the default raster style at a different XYZ source. Tile/style
 * keys embedded in these URLs are inherently client-exposed (the browser
 * requests them directly) -- NEXT_PUBLIC_* is correct here, unlike
 * geocoding secrets (src/lib/geocoding), which stay server-only.
 *
 * The public OSM tile server is only the zero-config default, never a
 * rigid dependency -- swappable via env var without touching code.
 */

const DEFAULT_TILE_URL_TEMPLATE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
const DEFAULT_MAX_ZOOM = 19;

export interface MapTileConfig {
  /** Full custom style URL/JSON. When set, takes over entirely. */
  styleUrl?: string;
  tileUrlTemplate: string;
  tileAttribution: string;
  maxZoom: number;
}

export function getMapTileConfig(): MapTileConfig {
  return {
    styleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL || undefined,
    tileUrlTemplate: process.env.NEXT_PUBLIC_MAP_TILE_URL_TEMPLATE || DEFAULT_TILE_URL_TEMPLATE,
    tileAttribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || DEFAULT_ATTRIBUTION,
    maxZoom: DEFAULT_MAX_ZOOM,
  };
}

export function buildMapStyle(config: MapTileConfig): StyleSpecification | string {
  if (config.styleUrl) return config.styleUrl;

  return {
    version: 8,
    sources: {
      "raster-tiles": {
        type: "raster",
        tiles: [config.tileUrlTemplate],
        tileSize: 256,
        attribution: config.tileAttribution,
      },
    },
    layers: [
      {
        id: "raster-tiles",
        type: "raster",
        source: "raster-tiles",
        minzoom: 0,
        maxzoom: config.maxZoom,
      },
    ],
  };
}
