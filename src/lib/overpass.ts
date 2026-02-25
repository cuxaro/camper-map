import type { LayerId } from "@/types/layers";

// Castellón province bounding box: south, west, north, east
const BBOX = "39.7,-0.7,40.9,0.6";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

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

// ─── Cache ────────────────────────────────────────────────────────────────────

function readCache(key: string): GeoJSON.FeatureCollection | null {
  try {
    const raw = sessionStorage.getItem(`osm_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(`osm_${key}`);
      return null;
    }
    return data as GeoJSON.FeatureCollection;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: GeoJSON.FeatureCollection) {
  try {
    sessionStorage.setItem(`osm_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // quota exceeded — ignore
  }
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function runQuery(ql: string): Promise<OverpassResponse> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(ql)}`,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
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
    } else if ((el.type === "way" || el.type === "relation") && el.center) {
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

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchCamping(): Promise<GeoJSON.FeatureCollection> {
  const cached = readCache("camping");
  if (cached) return cached;

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
      camp_site: "camping",
      caravan_site: "area",
      picnic_site: "picnic",
      shelter: "refugio",
    };

    const result = elementsToPoints(raw.elements, "camping", (el) => ({
      type: typeMap[el.tags?.tourism ?? el.tags?.amenity ?? ""] ?? "camping",
      water: el.tags?.drinking_water === "yes" || el.tags?.water === "yes",
      electricity: el.tags?.electricity === "yes",
      fee: el.tags?.fee === "yes",
      capacity: el.tags?.capacity ?? "",
      description: el.tags?.description ?? el.tags?.["description:es"] ?? "",
      website: el.tags?.website ?? el.tags?.url ?? "",
    }));

    writeCache("camping", result);
    return result;
  } catch (err) {
    console.error("Overpass camping error:", err);
    return EMPTY;
  }
}

export async function fetchAgua(): Promise<GeoJSON.FeatureCollection> {
  const cached = readCache("agua");
  if (cached) return cached;

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

    const result = elementsToPoints(raw.elements, "agua", (el) => ({
      potable:
        el.tags?.drinking_water !== "no" &&
        el.tags?.amenity === "drinking_water"
          ? true
          : el.tags?.drinking_water === "yes",
      permanent: el.tags?.seasonal !== "yes",
      flow: el.tags?.flow_rate ?? "",
    }));

    writeCache("agua", result);
    return result;
  } catch (err) {
    console.error("Overpass agua error:", err);
    return EMPTY;
  }
}

export async function fetchRutas(): Promise<GeoJSON.FeatureCollection> {
  const cached = readCache("rutas");
  if (cached) return cached;

  try {
    const ql = `
      [out:json][timeout:30];
      (
        way["highway"~"path|footway"]["sac_scale"](${BBOX});
        way["highway"="track"]["trail_visibility"~"excellent|good"](${BBOX});
      );
      out body geom;
    `;

    const raw = await runQuery(ql);
    const result = elementsToLines(raw.elements, "rutas");

    writeCache("rutas", result);
    return result;
  } catch (err) {
    console.error("Overpass rutas error:", err);
    return EMPTY;
  }
}
