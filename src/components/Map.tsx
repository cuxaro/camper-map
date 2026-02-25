"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import type { LayerId } from "@/types/layers";
import { campingData, aguaData, eventosData, wikipediaData } from "@/data/mock";

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

interface MapProps {
  enabledLayers: Set<LayerId>;
  onFeatureClick: (feature: GeoJSON.Feature) => void;
}

export default function Map({ enabledLayers, onFeatureClick }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const addSources = useCallback((map: maplibregl.Map) => {
    map.addSource("camping", { type: "geojson", data: campingData });
    map.addSource("agua", { type: "geojson", data: aguaData });
    map.addSource("eventos", { type: "geojson", data: eventosData });
    map.addSource("wikipedia", { type: "geojson", data: wikipediaData });
  }, []);

  const addLayers = useCallback((map: maplibregl.Map) => {
    // Camping layer
    map.addLayer({
      id: "camping-circle",
      type: "circle",
      source: "camping",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 6, 14, 12],
        "circle-color": LAYER_COLORS.camping,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
        "circle-opacity": 0.9,
      },
    });

    // Agua layer
    map.addLayer({
      id: "agua-circle",
      type: "circle",
      source: "agua",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 5, 14, 10],
        "circle-color": LAYER_COLORS.agua,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
        "circle-opacity": 0.9,
      },
    });

    // Eventos layer
    map.addLayer({
      id: "eventos-circle",
      type: "circle",
      source: "eventos",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 6, 14, 12],
        "circle-color": LAYER_COLORS.eventos,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
        "circle-opacity": 0.9,
      },
    });

    // Wikipedia layer
    map.addLayer({
      id: "wikipedia-circle",
      type: "circle",
      source: "wikipedia",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 6, 14, 12],
        "circle-color": LAYER_COLORS.wikipedia,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
        "circle-opacity": 0.9,
      },
    });

    // Labels for all layers
    const labelLayers = [
      { id: "camping-label", source: "camping" },
      { id: "agua-label", source: "agua" },
      { id: "eventos-label", source: "eventos" },
      { id: "wikipedia-label", source: "wikipedia" },
    ];

    labelLayers.forEach(({ id, source }) => {
      map.addLayer({
        id,
        type: "symbol",
        source,
        minzoom: 11,
        layout: {
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
    });
  }, []);

  const setupClickHandlers = useCallback(
    (map: maplibregl.Map) => {
      const clickableLayers = [
        "camping-circle",
        "agua-circle",
        "eventos-circle",
        "wikipedia-circle",
      ];

      clickableLayers.forEach((layerId) => {
        map.on("click", layerId, (e) => {
          if (e.features && e.features[0]) {
            onFeatureClick(e.features[0] as unknown as GeoJSON.Feature);
          }
        });
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      });
    },
    [onFeatureClick]
  );

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
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
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
      addSources(map);
      addLayers(map);
      setupClickHandlers(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [addSources, addLayers, setupClickHandlers]);

  // Sync layer visibility with enabledLayers prop
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const layerMap: Record<string, LayerId> = {
      "camping-circle": "camping",
      "camping-label": "camping",
      "agua-circle": "agua",
      "agua-label": "agua",
      "eventos-circle": "eventos",
      "eventos-label": "eventos",
      "wikipedia-circle": "wikipedia",
      "wikipedia-label": "wikipedia",
    };

    Object.entries(layerMap).forEach(([glLayerId, layerId]) => {
      if (map.getLayer(glLayerId)) {
        map.setLayoutProperty(
          glLayerId,
          "visibility",
          enabledLayers.has(layerId) ? "visible" : "none"
        );
      }
    });
  }, [enabledLayers]);

  return <div ref={containerRef} className="w-full h-full" />;
}
