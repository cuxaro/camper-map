"use client";

import { useState, useEffect, useCallback } from "react";
import type { LayerId } from "@/types/layers";
import { LAYERS } from "@/types/layers";

const STORAGE_KEY = "campermap_layers";

function loadFromStorage(): Set<LayerId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLayers();
    const arr = JSON.parse(raw) as string[];
    const valid = arr.filter((id): id is LayerId =>
      LAYERS.some((l) => l.id === id)
    );
    return new Set(valid);
  } catch {
    return defaultLayers();
  }
}

function defaultLayers(): Set<LayerId> {
  return new Set(LAYERS.filter((l) => l.enabled).map((l) => l.id));
}

export function usePersistedLayers() {
  const [enabledLayers, setEnabledLayers] = useState<Set<LayerId>>(defaultLayers);

  // Load from localStorage after hydration (client only)
  useEffect(() => {
    setEnabledLayers(loadFromStorage());
  }, []);

  // Persist on change
  const toggleLayer = useCallback((id: LayerId) => {
    setEnabledLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { enabledLayers, toggleLayer };
}
