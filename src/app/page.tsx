"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import LayerPanel from "@/components/LayerPanel";
import BottomSheet from "@/components/BottomSheet";
import { usePersistedLayers } from "@/hooks/usePersistedLayers";
import { useActiveRepos } from "@/hooks/useActiveRepos";
import { fetchLayer, type CacheInfo } from "@/lib/overpass";
import { eventosData } from "@/data/mock";
import type { LayerId } from "@/types/layers";
import { LAYERS } from "@/types/layers";
import { FUNCTIONAL_LAYER_IDS } from "@/lib/overpass-server";
import type { MapData } from "@/components/Map";
import type { RepoMeta } from "@/app/api/repos/upload/route";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export type LayerCacheInfo = Partial<Record<LayerId, CacheInfo>>;

export default function HomePage() {
  const { enabledLayers, toggleLayer } = usePersistedLayers();
  const { activeRepos, toggleRepo } = useActiveRepos();
  const [repoMetas, setRepoMetas] = useState<RepoMeta[]>([]);
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<GeoJSON.Feature | null>(null);
  const [data, setData] = useState<MapData>({
    eventos: eventosData,
  });
  const [repoDatas, setRepoDatas] = useState<Record<string, GeoJSON.FeatureCollection>>({});
  const [loadingLayers, setLoadingLayers] = useState<Set<LayerId>>(new Set());
  const [errorLayers, setErrorLayers] = useState<Set<LayerId>>(new Set());
  const [cacheInfo, setCacheInfo] = useState<LayerCacheInfo>({});

  // Generic loader — force=true bypasses cache
  const loadLayer = useCallback(async (
    id: LayerId,
    fetcher: (force: boolean) => Promise<{ data: GeoJSON.FeatureCollection; info: CacheInfo }>,
    force = false
  ) => {
    setLoadingLayers((prev) => new Set([...prev, id]));
    setErrorLayers((prev) => { const n = new Set(prev); n.delete(id); return n; });

    const { data: fc, info } = await fetcher(force);

    if (info.fresh && fc.features.length === 0) {
      setErrorLayers((prev) => new Set([...prev, id]));
    }

    setData((prev) => ({ ...prev, [id]: fc }));
    setCacheInfo((prev) => ({ ...prev, [id]: info }));
    setLoadingLayers((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }, []);

  // Load repo metadata list on mount
  useEffect(() => {
    fetch("/api/repos/list")
      .then((r) => r.json())
      .then((d) => setRepoMetas(d as RepoMeta[]))
      .catch(() => {});
  }, []);

  // Load all functional layers on mount
  useEffect(() => {
    for (const id of FUNCTIONAL_LAYER_IDS) {
      loadLayer(id, (force) => fetchLayer(id, force));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load active repos data whenever the list changes
  useEffect(() => {
    if (activeRepos.length === 0) { setRepoDatas({}); return; }
    void Promise.all(
      activeRepos.map(async (id) => {
        try {
          const res = await fetch(`/api/repos/${id}`);
          if (!res.ok) return null;
          const fc = await res.json() as GeoJSON.FeatureCollection;
          return { id, fc };
        } catch { return null; }
      })
    ).then((results) => {
      const next: Record<string, GeoJSON.FeatureCollection> = {};
      for (const r of results) { if (r) next[r.id] = r.fc; }
      setRepoDatas(next);
    });
  }, [activeRepos]);

  // Refresh one layer (or all)
  const handleRefresh = useCallback((id?: LayerId) => {
    if (id) {
      loadLayer(id, (force) => fetchLayer(id, force), true);
    } else {
      for (const lid of FUNCTIONAL_LAYER_IDS) {
        loadLayer(lid, (force) => fetchLayer(lid, force), true);
      }
    }
  }, [loadLayer]);

  const handleFeatureClick = useCallback((feature: GeoJSON.Feature) => {
    setSelectedFeature(feature);
    setLayerPanelOpen(false);
  }, []);

  const activeLayers = LAYERS.filter((l) => enabledLayers.has(l.id));
  const isAnyLoading = loadingLayers.size > 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-900">
      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-3 pt-3 pointer-events-none">
        <div className="pointer-events-auto bg-white/95 backdrop-blur rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
          <span className="text-lg">🏕</span>
          <span className="font-bold text-gray-900 text-sm tracking-tight">CamperMap</span>
        </div>

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
          repoDatas={repoDatas}
          selectedFeature={selectedFeature}
          onFeatureClick={handleFeatureClick}
        />
      </div>

      {/* Global loading indicator */}
      {isAnyLoading && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-white/95 backdrop-blur rounded-full px-3 py-1.5 shadow-lg flex items-center gap-2">
            <svg className="w-3 h-3 animate-spin text-green-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs text-gray-600 font-medium">Descargando datos OSM…</span>
          </div>
        </div>
      )}

      {/* Legend pills */}
      {!selectedFeature && activeLayers.length > 0 && (
        <div className="absolute bottom-6 left-3 flex flex-col gap-1.5 pointer-events-none z-[1000]">
          {activeLayers.map((layer) => (
            <div key={layer.id} className="flex items-center gap-1.5 bg-white/90 backdrop-blur rounded-full px-2 py-1 shadow text-xs font-medium text-gray-700">
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

      <LayerPanel
        open={layerPanelOpen}
        enabledLayers={enabledLayers}
        loadingLayers={loadingLayers}
        errorLayers={errorLayers}
        cacheInfo={cacheInfo}
        data={data}
        repoMetas={repoMetas}
        activeRepos={activeRepos}
        repoDatas={repoDatas}
        onToggle={toggleLayer}
        onToggleRepo={toggleRepo}
        onRefresh={handleRefresh}
        onClose={() => setLayerPanelOpen(false)}
      />

      <BottomSheet feature={selectedFeature} onClose={() => setSelectedFeature(null)} />
    </div>
  );
}
