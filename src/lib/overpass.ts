import type { LayerId } from "@/types/layers";

const BBOX = "39.7,-0.7,40.9,0.6"; // Castellón province: south,west,north,east
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
    // localStorage full — try clearing old entries
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

/** Returns cache metadata for a layer without loading data. Null if not cached. */
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

/** Clears cache for one layer, or all layers if no id given. */
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

export async function fetchCamping(force = false): Promise<{ data: GeoJSON.FeatureCollection; info: CacheInfo }> {
  if (!force) {
    const cached = readCache("camping");
    if (cached) return { data: cached.data, info: { ...cached, fresh: false } };
  }

  try {
    const ql = `
      [out:json][timeout:25];
      (
        node["tourism"="camp_site"](${BBOX});
        node["tourism"="caravan_site"](${BBOX});
        node["tourism"="picnic_site"](${BBOX});
        node["amenity"="shelter"](${BBOX});
        way["tourism"="camp_site"](${BBOX});
        way["tourism"="caravan_site"](${BBOX});
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

    writeCache("camping", data);
    return { data, info: { cachedAt: Date.now(), count: data.features.length, fresh: true } };
  } catch (err) {
    console.error("Overpass camping:", err);
    return { data: EMPTY, info: { cachedAt: Date.now(), count: 0, fresh: true } };
  }
}

export async function fetchAgua(force = false): Promise<{ data: GeoJSON.FeatureCollection; info: CacheInfo }> {
  if (!force) {
    const cached = readCache("agua");
    if (cached) return { data: cached.data, info: { ...cached, fresh: false } };
  }

  try {
    const ql = `
      [out:json][timeout:25];
      (
        node["amenity"="drinking_water"](${BBOX});
        node["natural"="spring"](${BBOX});
        node["amenity"="water_point"](${BBOX});
      );
      out body;
    `;

    const raw = await runQuery(ql);
    const data = elementsToPoints(raw.elements, "agua", (el) => ({
      potable: el.tags?.amenity === "drinking_water" || el.tags?.drinking_water === "yes",
      permanent: el.tags?.seasonal !== "yes",
      flow: el.tags?.flow_rate ?? "",
    }));

    writeCache("agua", data);
    return { data, info: { cachedAt: Date.now(), count: data.features.length, fresh: true } };
  } catch (err) {
    console.error("Overpass agua:", err);
    return { data: EMPTY, info: { cachedAt: Date.now(), count: 0, fresh: true } };
  }
}

export async function fetchRutas(force = false): Promise<{ data: GeoJSON.FeatureCollection; info: CacheInfo }> {
  if (!force) {
    const cached = readCache("rutas");
    if (cached) return { data: cached.data, info: { ...cached, fresh: false } };
  }

  try {
    const ql = `
      [out:json][timeout:30];
      (
        way["highway"="path"](${BBOX});
        way["highway"="footway"]["area"!="yes"](${BBOX});
        way["highway"="track"](${BBOX});
        way["highway"="bridleway"](${BBOX});
      );
      out body geom;
    `;

    const raw = await runQuery(ql);
    const data = elementsToLines(raw.elements, "rutas");

    if (data.features.length > 0) writeCache("rutas", data);
    return { data, info: { cachedAt: Date.now(), count: data.features.length, fresh: true } };
  } catch (err) {
    console.error("Overpass rutas:", err);
    return { data: EMPTY, info: { cachedAt: Date.now(), count: 0, fresh: true } };
  }
}
