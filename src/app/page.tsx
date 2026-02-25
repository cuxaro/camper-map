"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import LayerPanel from "@/components/LayerPanel";
import BottomSheet from "@/components/BottomSheet";
import { usePersistedLayers } from "@/hooks/usePersistedLayers";
import { fetchCamping, fetchAgua, fetchRutas } from "@/lib/overpass";
import { eventosData, wikipediaData } from "@/data/mock";
import type { LayerId } from "@/types/layers";
import { LAYERS } from "@/types/layers";
import type { MapData } from "@/components/Map";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function HomePage() {
  const { enabledLayers, toggleLayer } = usePersistedLayers();
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<GeoJSON.Feature | null>(null);
  const [data, setData] = useState<MapData>({
    eventos: eventosData,
    wikipedia: wikipediaData,
  });
  const [loadingLayers, setLoadingLayers] = useState<Set<LayerId>>(
    new Set(["camping", "agua", "rutas"])
  );

  // Fetch OSM data on mount
  useEffect(() => {
    async function load(
      id: LayerId,
      fetcher: () => Promise<GeoJSON.FeatureCollection>
    ) {
      try {
        const fc = await fetcher();
        setData((prev) => ({ ...prev, [id]: fc }));
      } catch {
        // fetcher handles errors internally, returns empty FC
      } finally {
        setLoadingLayers((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }

    load("camping", fetchCamping);
    load("agua", fetchAgua);
    load("rutas", fetchRutas);
  }, []);

  const handleFeatureClick = useCallback((feature: GeoJSON.Feature) => {
    setSelectedFeature(feature);
    setLayerPanelOpen(false);
  }, []);

  const activeLayers = LAYERS.filter((l) => enabledLayers.has(l.id));

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900">
      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 pt-3 pointer-events-none">
        {/* Logo */}
        <div className="pointer-events-auto bg-white/95 backdrop-blur rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
          <span className="text-lg">🏕</span>
          <span className="font-bold text-gray-900 text-sm tracking-tight">CamperMap</span>
          <span className="text-xs text-gray-400 font-normal">Castellón</span>
        </div>

        {/* Layers button */}
        <button
          onClick={() => setLayerPanelOpen(true)}
          className="pointer-events-auto bg-white/95 backdrop-blur rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 active:scale-95 transition-transform"
        >
          <span className="text-base">🗂</span>
          <span className="text-sm font-medium text-gray-700">Capas</span>
          <span className="text-xs bg-green-500 text-white font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center">
            {enabledLayers.size}
          </span>
        </button>
      </header>

      {/* Map */}
      <div className="flex-1">
        <Map
          enabledLayers={enabledLayers}
          data={data}
          onFeatureClick={handleFeatureClick}
        />
      </div>

      {/* Loading indicator */}
      {loadingLayers.size > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-white/95 backdrop-blur rounded-full px-3 py-1.5 shadow-lg flex items-center gap-2">
            <svg className="w-3 h-3 animate-spin text-green-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs text-gray-600 font-medium">
              Cargando datos OSM…
            </span>
          </div>
        </div>
      )}

      {/* Legend pills */}
      {!selectedFeature && activeLayers.length > 0 && (
        <div className="absolute bottom-6 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
          {activeLayers.map((layer) => (
            <div
              key={layer.id}
              className="flex items-center gap-1.5 bg-white/90 backdrop-blur rounded-full px-2 py-1 shadow text-xs font-medium text-gray-700"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
              {layer.icon} {layer.label}
              {loadingLayers.has(layer.id) && (
                <svg className="w-2.5 h-2.5 animate-spin text-gray-400 ml-0.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Layer panel */}
      <LayerPanel
        open={layerPanelOpen}
        enabledLayers={enabledLayers}
        onToggle={toggleLayer}
        onClose={() => setLayerPanelOpen(false)}
        loadingLayers={loadingLayers}
      />

      {/* Bottom sheet */}
      <BottomSheet
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
      />
    </div>
  );
}
