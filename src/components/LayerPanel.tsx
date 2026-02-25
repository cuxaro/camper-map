"use client";

import { LAYERS, LAYER_GROUPS } from "@/types/layers";
import type { LayerId } from "@/types/layers";
import type { CacheInfo } from "@/lib/overpass";
import type { MapData } from "@/components/Map";

interface LayerPanelProps {
  open: boolean;
  enabledLayers: Set<LayerId>;
  loadingLayers: Set<LayerId>;
  errorLayers: Set<LayerId>;
  cacheInfo: Partial<Record<LayerId, CacheInfo>>;
  data: MapData;
  onToggle: (id: LayerId) => void;
  onRefresh: (id?: LayerId) => void;
  onClose: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora mismo";
  if (m < 60) return `hace ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function LayerPanel({
  open,
  enabledLayers,
  loadingLayers,
  errorLayers,
  cacheInfo,
  data,
  onToggle,
  onRefresh,
  onClose,
}: LayerPanelProps) {
  const implementedLayers = LAYERS.filter((l) => l.implemented);
  const comingSoonLayers = LAYERS.filter((l) => !l.implemented);
  const isAnyLoading = loadingLayers.size > 0;

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-[1001]" onClick={onClose} />}

      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-[1002] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Capas del mapa</h2>
            <p className="text-xs text-gray-500 mt-0.5">Activa lo que quieres ver</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500"
          >
            ✕
          </button>
        </div>

        {/* Layer list */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Grouped layers ──────────────────────────────────────────── */}
          {LAYER_GROUPS.map((group) => {
            const groupLayers = implementedLayers.filter((l) => l.group === group.id);
            if (groupLayers.length === 0) return null;
            return (
              <div key={group.id} className="py-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">
                  {group.label}
                </p>
                {groupLayers.map((layer) => {
                  const active = enabledLayers.has(layer.id);
                  const loading = loadingLayers.has(layer.id);
                  const hasError = errorLayers.has(layer.id);
                  const info = cacheInfo[layer.id];
                  const count = data[layer.id]?.features.length ?? 0;

                  return (
                    <div key={layer.id} className={`flex items-start gap-3 px-4 py-3 ${active ? "bg-gray-50" : ""}`}>
                      <button
                        onClick={() => onToggle(layer.id)}
                        className="flex items-start gap-3 flex-1 min-w-0 text-left"
                      >
                        <div className="relative mt-0.5 shrink-0">
                          <span className="text-xl">{layer.icon}</span>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white transition-opacity ${active ? "opacity-100" : "opacity-30"}`}
                            style={{ backgroundColor: layer.color }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-medium text-sm ${active ? "text-gray-900" : "text-gray-500"}`}>
                              {layer.label}
                            </span>
                            {loading ? (
                              <Spinner className="w-4 h-4 text-gray-400 shrink-0" />
                            ) : (
                              <div className={`shrink-0 w-9 h-5 rounded-full transition-colors ${active ? "bg-green-500" : "bg-gray-200"}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transform transition-transform ${active ? "translate-x-4" : "translate-x-0.5"}`} />
                              </div>
                            )}
                          </div>

                          <p className="text-xs text-gray-400 mt-0.5 leading-tight">{layer.description}</p>

                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {loading ? (
                              <span className="text-xs text-amber-500">descargando…</span>
                            ) : hasError ? (
                              <span className="text-xs text-red-400 flex items-center gap-1">
                                ⚠ Error · <button onClick={(e) => { e.stopPropagation(); onRefresh(layer.id); }} className="underline">reintentar</button>
                              </span>
                            ) : info ? (
                              <>
                                <span className="text-xs text-gray-400">
                                  {count > 0 ? <span className="font-medium text-gray-600">{count} elementos</span> : "sin datos"}
                                </span>
                                <span className="text-gray-300">·</span>
                                <span className="text-xs text-gray-400">{timeAgo(info.cachedAt)}</span>
                                {!info.fresh && <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">caché</span>}
                              </>
                            ) : (
                              <span className="text-xs text-gray-300">sin descargar</span>
                            )}
                          </div>
                        </div>
                      </button>

                      {!loading && (
                        <button
                          onClick={() => onRefresh(layer.id)}
                          title="Forzar descarga"
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 mt-0.5 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ── Coming soon ─────────────────────────────────────────────── */}
          {comingSoonLayers.length > 0 && (
            <div className="border-t border-dashed border-gray-200 pt-3 pb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 mb-2">
                Próximamente
              </p>
              {comingSoonLayers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-start gap-3 px-4 py-2.5 opacity-50 cursor-not-allowed select-none"
                >
                  <div className="relative mt-0.5 shrink-0">
                    <span className="text-xl grayscale">{layer.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm text-gray-400">{layer.label}</span>
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full shrink-0">
                        {layer.comingSoon}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 leading-tight">{layer.description}</p>
                    <p className="text-xs text-gray-300 mt-1">Fuente: {layer.source}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — global refresh */}
        <div className="px-4 py-3 border-t border-gray-100 shrink-0">
          <button
            onClick={() => onRefresh()}
            disabled={isAnyLoading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAnyLoading ? (
              <>
                <Spinner className="w-3.5 h-3.5 text-gray-400" />
                Descargando…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Actualizar todos los datos
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            v0.2 · Cache 24h · OSM Castellón
          </p>
        </div>
      </div>
    </>
  );
}
