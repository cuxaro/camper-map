"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import LayerPanel from "@/components/LayerPanel";
import BottomSheet from "@/components/BottomSheet";
import type { LayerId } from "@/types/layers";
import { LAYERS } from "@/types/layers";

// MapLibre needs browser APIs — load client-side only
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

const initialLayers = new Set<LayerId>(
  LAYERS.filter((l) => l.enabled).map((l) => l.id)
);

export default function HomePage() {
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [enabledLayers, setEnabledLayers] = useState<Set<LayerId>>(initialLayers);
  const [selectedFeature, setSelectedFeature] = useState<GeoJSON.Feature | null>(null);

  const toggleLayer = useCallback((id: LayerId) => {
    setEnabledLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleFeatureClick = useCallback((feature: GeoJSON.Feature) => {
    setSelectedFeature(feature);
    setLayerPanelOpen(false);
  }, []);

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
          onFeatureClick={handleFeatureClick}
        />
      </div>

      {/* Legend pills — bottom left, above controls */}
      {!selectedFeature && (
        <div className="absolute bottom-6 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
          {LAYERS.filter((l) => enabledLayers.has(l.id)).map((layer) => (
            <div
              key={layer.id}
              className="flex items-center gap-1.5 bg-white/90 backdrop-blur rounded-full px-2 py-1 shadow text-xs font-medium text-gray-700"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: layer.color }}
              />
              {layer.icon} {layer.label}
            </div>
          ))}
        </div>
      )}

      {/* Layer panel drawer */}
      <LayerPanel
        open={layerPanelOpen}
        enabledLayers={enabledLayers}
        onToggle={toggleLayer}
        onClose={() => setLayerPanelOpen(false)}
      />

      {/* Bottom sheet detail */}
      <BottomSheet
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
      />
    </div>
  );
}
