import type { LayerId } from "@/types/layers";

const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const CACHE_PREFIX = "campermap_osm_";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CacheInfo {
  cachedAt: number;   // unix ms timestamp
  count: number;      // number of GeoJSON features
  fresh: boolean;     // false = loaded from local cache, true = just fetched
}

interface StoredEntry {
  data: GeoJSON.FeatureCollection;
  cachedAt: number;
  count: number;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function cacheKey(id: string) {
  return `${CACHE_PREFIX}${id}`;
}

function readCache(id: string): StoredEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(id));
    if (!raw) return null;
    const entry = JSON.parse(raw) as StoredEntry;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(id));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeCache(id: string, data: GeoJSON.FeatureCollection) {
  try {
    const entry: StoredEntry = { data, cachedAt: Date.now(), count: data.features.length };
    localStorage.setItem(cacheKey(id), JSON.stringify(entry));
  } catch (e) {
    try {
      clearOldEntries();
      const entry: StoredEntry = { data, cachedAt: Date.now(), count: data.features.length };
      localStorage.setItem(cacheKey(id), JSON.stringify(entry));
    } catch {
      console.warn("localStorage quota exceeded, cache skipped:", e);
    }
  }
}

function clearOldEntries() {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
  for (const k of keys) localStorage.removeItem(k);
}

// ─── Public cache API ─────────────────────────────────────────────────────────

export function getCacheInfo(id: string): Omit<CacheInfo, "fresh"> | null {
  try {
    const raw = localStorage.getItem(cacheKey(id));
    if (!raw) return null;
    const entry = JSON.parse(raw) as StoredEntry;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
    return { cachedAt: entry.cachedAt, count: entry.count };
  } catch {
    return null;
  }
}

export function clearLayerCache(id?: string) {
  if (id) {
    localStorage.removeItem(cacheKey(id));
  } else {
    clearOldEntries();
  }
}

// ─── Fetch via server cache ───────────────────────────────────────────────────

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/**
 * Fetch a layer from the server-side cache (Route Handler).
 * Falls back to localStorage for offline use.
 * force=true bypasses both server cache (via ?force=1) and local cache.
 */
export async function fetchLayer(
  layerId: LayerId,
  force = false
): Promise<{ data: GeoJSON.FeatureCollection; info: CacheInfo }> {
  // Try local cache first (unless forcing)
  if (!force) {
    const cached = readCache(layerId);
    if (cached) {
      return { data: cached.data, info: { ...cached, fresh: false } };
    }
  }

  try {
    const url = `/api/layers/${layerId}${force ? "?force=1" : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${res.status}`);

    const result = await res.json() as { data: GeoJSON.FeatureCollection; cachedAt: number; count: number };
    const { data, cachedAt, count } = result;

    if (data.features.length > 0) writeCache(layerId, data);
    return { data, info: { cachedAt, count, fresh: true } };
  } catch (err) {
    // Offline fallback: try local cache even if expired
    try {
      const raw = localStorage.getItem(cacheKey(layerId));
      if (raw) {
        const entry = JSON.parse(raw) as StoredEntry;
        return { data: entry.data, info: { cachedAt: entry.cachedAt, count: entry.count, fresh: false } };
      }
    } catch {
      // ignore
    }
    console.error(`fetchLayer(${layerId}):`, err);
    return { data: EMPTY, info: { cachedAt: Date.now(), count: 0, fresh: true } };
  }
}
