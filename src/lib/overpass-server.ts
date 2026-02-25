import type { LayerId } from "@/types/layers";

export const CASTELLON_BBOX = "39.7,-0.7,40.9,0.6";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

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

export interface LayerResponse {
  data: GeoJSON.FeatureCollection;
  cachedAt: number;
  count: number;
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

// ─── Per-layer fetch logic ────────────────────────────────────────────────────

async function fetchCamping(): Promise<GeoJSON.FeatureCollection> {
  const bbox = CASTELLON_BBOX;
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
  return elementsToPoints(raw.elements, "camping", (el) => ({
    type: typeMap[el.tags?.tourism ?? el.tags?.amenity ?? ""] ?? "camping",
    water: el.tags?.drinking_water === "yes" || el.tags?.water === "yes",
    electricity: el.tags?.electricity === "yes",
    fee: el.tags?.fee === "yes",
    capacity: el.tags?.capacity ?? "",
    description: el.tags?.description ?? el.tags?.["description:es"] ?? "",
    website: el.tags?.website ?? el.tags?.url ?? "",
  }));
}

async function fetchAgua(): Promise<GeoJSON.FeatureCollection> {
  const bbox = CASTELLON_BBOX;
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
  return elementsToPoints(raw.elements, "agua", (el) => ({
    potable: el.tags?.amenity === "drinking_water" || el.tags?.drinking_water === "yes",
    permanent: el.tags?.seasonal !== "yes",
    flow: el.tags?.flow_rate ?? "",
  }));
}

async function fetchRutas(): Promise<GeoJSON.FeatureCollection> {
  const bbox = CASTELLON_BBOX;
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
  return elementsToLines(raw.elements, "rutas");
}

async function fetchWC(): Promise<GeoJSON.FeatureCollection> {
  const bbox = CASTELLON_BBOX;
  const ql = `
    [out:json][timeout:25];
    (
      node["amenity"="toilets"](${bbox});
      way["amenity"="toilets"](${bbox});
    );
    out body center;
  `;
  const raw = await runQuery(ql);
  return elementsToPoints(raw.elements, "wc", (el) => ({
    fee: el.tags?.fee === "yes",
    access: el.tags?.access ?? "public",
    opening_hours: el.tags?.opening_hours ?? "",
  }));
}

async function fetchBiblioteca(): Promise<GeoJSON.FeatureCollection> {
  const bbox = CASTELLON_BBOX;
  const ql = `
    [out:json][timeout:25];
    (
      node["amenity"="library"](${bbox});
      way["amenity"="library"](${bbox});
    );
    out body center;
  `;
  const raw = await runQuery(ql);
  return elementsToPoints(raw.elements, "biblioteca", (el) => ({
    opening_hours: el.tags?.opening_hours ?? "",
    website: el.tags?.website ?? el.tags?.url ?? "",
    wifi: el.tags?.["internet_access"] === "wlan" || el.tags?.["internet_access"] === "yes",
  }));
}

// ─── Ivan fetch ───────────────────────────────────────────────────────────────

async function fetchIvan(): Promise<GeoJSON.FeatureCollection> {
  const bbox = CASTELLON_BBOX;
  const ql = `
    [out:json][timeout:30];
    (
      node["landuse"="cemetery"](${bbox});
      way["landuse"="cemetery"](${bbox});
      node["amenity"="grave_yard"](${bbox});
      way["amenity"="grave_yard"](${bbox});
      node["amenity"="library"](${bbox});
      way["amenity"="library"](${bbox});
    );
    out body center;
  `;
  const raw = await runQuery(ql);
  return elementsToPoints(raw.elements, "ivan", (el) => {
    const isCemetery = el.tags?.landuse === "cemetery" || el.tags?.amenity === "grave_yard";
    return {
      type: isCemetery ? "cementerio" : "biblioteca",
      opening_hours: el.tags?.opening_hours ?? "",
      website: el.tags?.website ?? el.tags?.url ?? "",
      wifi: el.tags?.["internet_access"] === "wlan" || el.tags?.["internet_access"] === "yes",
    };
  });
}

// ─── Wikipedia fetch ──────────────────────────────────────────────────────────

const WIKI_BASE = "https://es.wikipedia.org/w/api.php";
// The Wikipedia geosearch API rejects bounding boxes larger than ~0.2°x0.2°.
// We tile the full Castellón bbox into 0.18° cells and query all tiles in parallel.
const WIKI_TILE_DEG = 0.18;
const CASTELLON_MIN_LAT = 39.7;
const CASTELLON_MAX_LAT = 40.9;
const CASTELLON_MIN_LON = -0.7;
const CASTELLON_MAX_LON = 0.6;

interface WikiGeoItem {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
}

interface WikiPage {
  pageid: number;
  title: string;
  extract?: string;
}

async function fetchWikipediaTile(
  minLat: number, minLon: number, maxLat: number, maxLon: number
): Promise<WikiGeoItem[]> {
  const url = new URL(WIKI_BASE);
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "geosearch");
  // gsbbox: maxlat|minlon|minlat|maxlon
  url.searchParams.set("gsbbox", `${maxLat}|${minLon}|${minLat}|${maxLon}`);
  url.searchParams.set("gslimit", "500");
  url.searchParams.set("gsnamespace", "0");
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json() as { query?: { geosearch?: WikiGeoItem[] } };
    return data.query?.geosearch ?? [];
  } catch {
    return [];
  }
}

async function fetchWikipedia(): Promise<GeoJSON.FeatureCollection> {
  // Step 1: generate tile grid and fetch all tiles in parallel
  const tilePromises: Promise<WikiGeoItem[]>[] = [];
  for (let lat = CASTELLON_MIN_LAT; lat < CASTELLON_MAX_LAT; lat += WIKI_TILE_DEG) {
    for (let lon = CASTELLON_MIN_LON; lon < CASTELLON_MAX_LON; lon += WIKI_TILE_DEG) {
      const maxLat = Math.min(lat + WIKI_TILE_DEG, CASTELLON_MAX_LAT);
      const maxLon = Math.min(lon + WIKI_TILE_DEG, CASTELLON_MAX_LON);
      tilePromises.push(fetchWikipediaTile(lat, lon, maxLat, maxLon));
    }
  }
  const tileResults = await Promise.all(tilePromises);

  // Step 2: flatten and deduplicate by pageId
  const seen = new Set<number>();
  const items: WikiGeoItem[] = [];
  for (const tile of tileResults) {
    for (const item of tile) {
      if (!seen.has(item.pageid)) {
        seen.add(item.pageid);
        items.push(item);
      }
    }
  }

  if (items.length === 0) return EMPTY;

  // Step 3: batch-fetch plain-text intro extracts (100 per call)
  const summaries = new Map<number, string>();
  for (let i = 0; i < items.length; i += 100) {
    const ids = items.slice(i, i + 100).map((p) => p.pageid).join("|");
    const sumUrl = new URL(WIKI_BASE);
    sumUrl.searchParams.set("action", "query");
    sumUrl.searchParams.set("pageids", ids);
    sumUrl.searchParams.set("prop", "extracts");
    sumUrl.searchParams.set("exintro", "1");
    sumUrl.searchParams.set("explaintext", "1");
    sumUrl.searchParams.set("exsentences", "3");
    sumUrl.searchParams.set("format", "json");

    try {
      const sumRes = await fetch(sumUrl.toString());
      if (sumRes.ok) {
        const sumData = await sumRes.json() as { query?: { pages?: Record<string, WikiPage> } };
        for (const page of Object.values(sumData.query?.pages ?? {})) {
          summaries.set(page.pageid, page.extract ?? "");
        }
      }
    } catch {
      // partial failure — continue with empty summaries for this batch
    }
  }

  // Step 4: build GeoJSON
  const features: GeoJSON.Feature[] = items.map((item) => ({
    type: "Feature",
    id: item.pageid,
    geometry: { type: "Point", coordinates: [item.lon, item.lat] },
    properties: {
      _layerId: "wikipedia" as LayerId,
      _osmId: `wikipedia/${item.pageid}`,
      name: item.title,
      summary: summaries.get(item.pageid) ?? "",
      url: `https://es.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
    },
  }));

  return { type: "FeatureCollection", features };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const FUNCTIONAL_LAYER_IDS: LayerId[] = ["camping", "agua", "rutas", "wc", "biblioteca", "wikipedia", "ivan"];

export async function fetchLayerFromOverpass(layerId: LayerId): Promise<LayerResponse> {
  let data: GeoJSON.FeatureCollection;

  switch (layerId) {
    case "camping":    data = await fetchCamping(); break;
    case "agua":       data = await fetchAgua(); break;
    case "rutas":      data = await fetchRutas(); break;
    case "wc":         data = await fetchWC(); break;
    case "biblioteca": data = await fetchBiblioteca(); break;
    case "wikipedia":  data = await fetchWikipedia(); break;
    case "ivan":       data = await fetchIvan(); break;
    default:
      data = EMPTY;
  }

  return { data, cachedAt: Date.now(), count: data.features.length };
}
