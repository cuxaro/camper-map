"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { LayerId } from "@/types/layers";

const CASTELLON_CENTER: [number, number] = [-0.0899, 40.1428];
const CASTELLON_ZOOM = 9;

const LAYER_COLORS: Record<LayerId, string> = {
  camping: "#22c55e",
  rutas: "#f97316",
  agua: "#38bdf8",
  wikipedia: "#a855f7",
  clima: "#facc15",
  eventos: "#f43f5e",
};

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export type MapData = Partial<Record<LayerId, GeoJSON.FeatureCollection>>;

interface MapProps {
  enabledLayers: Set<LayerId>;
  data: MapData;
  onFeatureClick: (feature: GeoJSON.Feature) => void;
}

// MapLibre layer IDs grouped by LayerId
const LAYER_GL_IDS: Partial<Record<LayerId, string[]>> = {
  camping: ["camping-circle", "camping-label"],
  agua: ["agua-circle", "agua-label"],
  eventos: ["eventos-circle", "eventos-label"],
  wikipedia: ["wikipedia-circle", "wikipedia-label"],
  rutas: ["rutas-line"],
};

export default function Map({ enabledLayers, data, onFeatureClick }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // ── Bootstrap map once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm-tiles", type: "raster", source: "osm" }],
      },
      center: CASTELLON_CENTER,
      zoom: CASTELLON_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "bottom-right"
    );

    map.on("load", () => {
      // Add all sources (empty — data arrives via props)
      const pointSources: LayerId[] = ["camping", "agua", "eventos", "wikipedia"];
      for (const id of pointSources) {
        map.addSource(id, { type: "geojson", data: EMPTY_FC });
      }
      map.addSource("rutas", { type: "geojson", data: EMPTY_FC });

      // ── Rutas — line layer ──────────────────────────────────────────────
      map.addLayer({
        id: "rutas-line",
        type: "line",
        source: "rutas",
        layout: { visibility: "none" },
        paint: {
          "line-color": LAYER_COLORS.rutas,
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1.5, 14, 3],
          "line-opacity": 0.85,
        },
      });

      // ── Camping ────────────────────────────────────────────────────────
      map.addLayer({
        id: "camping-circle",
        type: "circle",
        source: "camping",
        layout: { visibility: "visible" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 6, 14, 12],
          "circle-color": LAYER_COLORS.camping,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
          "circle-opacity": 0.9,
        },
      });

      // ── Agua ───────────────────────────────────────────────────────────
      map.addLayer({
        id: "agua-circle",
        type: "circle",
        source: "agua",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 5, 14, 10],
          "circle-color": LAYER_COLORS.agua,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
          "circle-opacity": 0.9,
        },
      });

      // ── Eventos ────────────────────────────────────────────────────────
      map.addLayer({
        id: "eventos-circle",
        type: "circle",
        source: "eventos",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 6, 14, 12],
          "circle-color": LAYER_COLORS.eventos,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
          "circle-opacity": 0.9,
        },
      });

      // ── Wikipedia ──────────────────────────────────────────────────────
      map.addLayer({
        id: "wikipedia-circle",
        type: "circle",
        source: "wikipedia",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 6, 14, 12],
          "circle-color": LAYER_COLORS.wikipedia,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
          "circle-opacity": 0.9,
        },
      });

      // ── Labels (zoom 11+) ──────────────────────────────────────────────
      const labelCfg = [
        { id: "camping-label", source: "camping", visibility: "visible" },
        { id: "agua-label", source: "agua", visibility: "none" },
        { id: "eventos-label", source: "eventos", visibility: "none" },
        { id: "wikipedia-label", source: "wikipedia", visibility: "none" },
      ] as const;

      for (const { id, source, visibility } of labelCfg) {
        map.addLayer({
          id,
          type: "symbol",
          source,
          minzoom: 11,
          layout: {
            visibility,
            "text-field": ["get", "name"],
            "text-size": 11,
            "text-offset": [0, 1.5],
            "text-anchor": "top",
            "text-font": ["Open Sans Regular"],
          },
          paint: {
            "text-color": "#1f2937",
            "text-halo-color": "#fff",
            "text-halo-width": 1.5,
          },
        });
      }

      // ── Click handlers ─────────────────────────────────────────────────
      const clickable = [
        "camping-circle",
        "agua-circle",
        "eventos-circle",
        "wikipedia-circle",
        "rutas-line",
      ];

      for (const layerId of clickable) {
        map.on("click", layerId, (e) => {
          if (e.features?.[0]) {
            onFeatureClick(e.features[0] as unknown as GeoJSON.Feature);
          }
        });
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      setMapLoaded(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync external data into MapLibre sources ───────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const sources: LayerId[] = ["camping", "agua", "eventos", "wikipedia", "rutas"];
    for (const id of sources) {
      const fc = data[id];
      if (fc) {
        (map.getSource(id) as maplibregl.GeoJSONSource | undefined)?.setData(fc);
      }
    }
  }, [mapLoaded, data]);

  // ── Sync layer visibility ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    for (const [layerId, glIds] of Object.entries(LAYER_GL_IDS) as [LayerId, string[]][]) {
      const visibility = enabledLayers.has(layerId) ? "visible" : "none";
      for (const glId of glIds) {
        if (map.getLayer(glId)) {
          map.setLayoutProperty(glId, "visibility", visibility);
        }
      }
    }
  }, [mapLoaded, enabledLayers]);

  // Keep onFeatureClick ref stable to avoid re-mounting map
  const onClickRef = useRef(onFeatureClick);
  onClickRef.current = onFeatureClick;

  return <div ref={containerRef} className="w-full h-full" />;
}
