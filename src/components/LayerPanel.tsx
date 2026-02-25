"use client";

import { LAYERS } from "@/types/layers";
import type { LayerId } from "@/types/layers";

interface LayerPanelProps {
  open: boolean;
  enabledLayers: Set<LayerId>;
  loadingLayers: Set<LayerId>;
  onToggle: (id: LayerId) => void;
  onClose: () => void;
}

export default function LayerPanel({
  open,
  enabledLayers,
  loadingLayers,
  onToggle,
  onClose,
}: LayerPanelProps) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-20" onClick={onClose} />}

      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-30 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
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
        <div className="flex-1 overflow-y-auto py-2">
          {LAYERS.map((layer) => {
            const active = enabledLayers.has(layer.id);
            const loading = loadingLayers.has(layer.id);

            return (
              <button
                key={layer.id}
                onClick={() => onToggle(layer.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                  active ? "bg-gray-50" : "hover:bg-gray-50"
                }`}
              >
                {/* Icon */}
                <div className="relative mt-0.5 shrink-0">
                  <span className="text-xl">{layer.icon}</span>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white transition-opacity ${
                      active ? "opacity-100" : "opacity-30"
                    }`}
                    style={{ backgroundColor: layer.color }}
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-medium text-sm ${active ? "text-gray-900" : "text-gray-500"}`}>
                      {layer.label}
                    </span>

                    {loading ? (
                      <svg className="w-4 h-4 animate-spin text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      /* Toggle pill */
                      <div className={`shrink-0 w-9 h-5 rounded-full transition-colors ${active ? "bg-green-500" : "bg-gray-200"}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transform transition-transform ${active ? "translate-x-4" : "translate-x-0.5"}`} />
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{layer.description}</p>

                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-gray-300">Fuente: {layer.source}</span>
                    {loading && (
                      <span className="text-xs text-amber-500 font-medium">cargando…</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">v0.2 · Datos reales OSM · Castellón</p>
        </div>
      </div>
    </>
  );
}
