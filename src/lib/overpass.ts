import type { LayerId } from "@/types/layers";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const CACHE_PREFIX = "campermap_osm_";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

export interface CacheInfo {
  cachedAt: number;   // unix ms timestamp
  count: number;      // number of GeoJSON features
  fresh: boolean;     // false = loaded from cache, true = just fetched
}

interface StoredEntry {
  data: GeoJSON.FeatureCollection;
  cachedAt: number;
  count: number;
  bbox?: string;      // undefined = old format → always invalidate
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function cacheKey(id: string) {
  return `${CACHE_PREFIX}${id}`;
}

function readCache(id: string, bbox: string): StoredEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(id));
    if (!raw) return null;
    const entry = JSON.parse(raw) as StoredEntry;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(id));
      return null;
    }
    if (entry.bbox !== bbox) return null; // different area → fetch fresh
    return entry;
  } catch {
    return null;
  }
}

function writeCache(id: string, data: GeoJSON.FeatureCollection, bbox: string) {
  try {
    const entry: StoredEntry = { data, cachedAt: Date.now(), count: data.features.length, bbox };
    localStorage.setItem(cacheKey(id), JSON.stringify(entry));
  } catch (e) {
    try {
      clearOldEntries();
      const entry: StoredEntry = { data, cachedAt: Date.now(), count: data.features.length, bbox };
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

// ─── Overpass fetch ───────────────────────────────────────────────────────────

async function runQuery(ql: string): Promise<OverpassResponse> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(ql)}`,
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  return res.json() as Promise<OverpassResponse>;
}

// ─── Converters ───────────────────────────────────────────────────────────────

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function elementsToPoints(
  elements: OverpassElement[],
  layerId: LayerId,
  propsMapper: (el: OverpassElement) => Record<string, unknown>
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const el of elements) {
    let lon: number | undefined;
    let lat: number | undefined;

    if (el.type === "node") {
      lon = el.lon;
      lat = el.lat;
    } else if (el.center) {
      lon = el.center.lon;
      lat = el.center.lat;
    }

    if (lon == null || lat == null) continue;

    features.push({
      type: "Feature",
      id: el.id,
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        _layerId: layerId,
        _osmId: `${el.type}/${el.id}`,
        name: el.tags?.name ?? el.tags?.["name:es"] ?? "Sin nombre",
        ...propsMapper(el),
      },
    });
  }

  return { type: "FeatureCollection", features };
}

function elementsToLines(
  elements: OverpassElement[],
  layerId: LayerId
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const el of elements) {
    if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;
    features.push({
      type: "Feature",
      id: el.id,
      geometry: {
        type: "LineString",
        coordinates: el.geometry.map((p) => [p.lon, p.lat]),
      },
      properties: {
        _layerId: layerId,
        _osmId: `way/${el.id}`,
        name: el.tags?.name ?? el.tags?.["name:es"] ?? "Sendero",
        highway: el.tags?.highway ?? "",
        sac_scale: el.tags?.sac_scale ?? "",
        surface: el.tags?.surface ?? "",
        distance: el.tags?.distance ?? "",
        description: el.tags?.description ?? el.tags?.["description:es"] ?? "",
      },
    });
  }

  return { type: "FeatureCollection", features };
}

// ─── Fetch functions ──────────────────────────────────────────────────────────

export async function fetchCamping(bbox: string, force = false): Promise<{ data: GeoJSON.FeatureCollection; info: CacheInfo }> {
  if (!force) {
    const cached = readCache("camping", bbox);
    if (cached) return { data: cached.data, info: { ...cached, fresh: false } };
  }

  try {
    const ql = `
      [out:json][timeout:25];
      (
        node["tourism"="camp_site"](${bbox});
        node["tourism"="caravan_site"](${bbox});
        node["tourism"="picnic_site"](${bbox});
        node["amenity"="shelter"](${bbox});
        way["tourism"="camp_site"](${bbox});
        way["tourism"="caravan_site"](${bbox});
      );
      out body center;
    `;

    const raw = await runQuery(ql);

    const typeMap: Record<string, string> = {
      camp_site: "camping", caravan_site: "area",
      picnic_site: "picnic", shelter: "refugio",
    };

    const data = elementsToPoints(raw.elements, "camping", (el) => ({
      type: typeMap[el.tags?.tourism ?? el.tags?.amenity ?? ""] ?? "camping",
      water: el.tags?.drinking_water === "yes" || el.tags?.water === "yes",
      electricity: el.tags?.electricity === "yes",
      fee: el.tags?.fee === "yes",
      capacity: el.tags?.capacity ?? "",
      description: el.tags?.description ?? el.tags?.["description:es"] ?? "",
      website: el.tags?.website ?? el.tags?.url ?? "",
    }));

    if (data.features.length > 0) writeCache("camping", data, bbox);
    return { data, info: { cachedAt: Date.now(), count: data.features.length, fresh: true } };
  } catch (err) {
    console.error("Overpass camping:", err);
    return { data: EMPTY, info: { cachedAt: Date.now(), count: 0, fresh: true } };
  }
}

export async function fetchAgua(bbox: string, force = false): Promise<{ data: GeoJSON.FeatureCollection; info: CacheInfo }> {
  if (!force) {
    const cached = readCache("agua", bbox);
    if (cached) return { data: cached.data, info: { ...cached, fresh: false } };
  }

  try {
    const ql = `
      [out:json][timeout:25];
      (
        node["amenity"="drinking_water"](${bbox});
        node["natural"="spring"](${bbox});
        node["amenity"="water_point"](${bbox});
      );
      out body;
    `;

    const raw = await runQuery(ql);
    const data = elementsToPoints(raw.elements, "agua", (el) => ({
      potable: el.tags?.amenity === "drinking_water" || el.tags?.drinking_water === "yes",
      permanent: el.tags?.seasonal !== "yes",
      flow: el.tags?.flow_rate ?? "",
    }));

    if (data.features.length > 0) writeCache("agua", data, bbox);
    return { data, info: { cachedAt: Date.now(), count: data.features.length, fresh: true } };
  } catch (err) {
    console.error("Overpass agua:", err);
    return { data: EMPTY, info: { cachedAt: Date.now(), count: 0, fresh: true } };
  }
}

export async function fetchRutas(bbox: string, force = false): Promise<{ data: GeoJSON.FeatureCollection; info: CacheInfo }> {
  if (!force) {
    const cached = readCache("rutas", bbox);
    if (cached) return { data: cached.data, info: { ...cached, fresh: false } };
  }

  try {
    const ql = `
      [out:json][timeout:30];
      (
        way["highway"="path"](${bbox});
        way["highway"="footway"]["area"!="yes"](${bbox});
        way["highway"="track"](${bbox});
        way["highway"="bridleway"](${bbox});
      );
      out body geom;
    `;

    const raw = await runQuery(ql);
    const data = elementsToLines(raw.elements, "rutas");

    if (data.features.length > 0) writeCache("rutas", data, bbox);
    return { data, info: { cachedAt: Date.now(), count: data.features.length, fresh: true } };
  } catch (err) {
    console.error("Overpass rutas:", err);
    return { data: EMPTY, info: { cachedAt: Date.now(), count: 0, fresh: true } };
  }
}
