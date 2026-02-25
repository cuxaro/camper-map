# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server with Turbopack (hot reload)
npm run build    # Production build
npm start        # Serve production build
npm run lint     # ESLint (next/core-web-vitals + TypeScript)
```

No test runner configured. Deploy via push to `main` → Vercel auto-deploys.

## Stack

Next.js 15 / React 19 / TypeScript / Tailwind CSS 4 / **Leaflet** (via react-leaflet) / react-leaflet-cluster

> **MapLibre was replaced with Leaflet** — the dev environment runs on WSL2/Docker without GPU, so WebGL is unavailable. Leaflet uses Canvas/SVG and works everywhere.

## Architecture

**CamperMap** is a fully client-side app (no backend). All data comes from OpenStreetMap via the Overpass API, cached in localStorage (24h TTL).

### Data flow

```
page.tsx (state owner)
  ├── usePersistedLayers()         → enabledLayers: Set<LayerId>  (localStorage)
  ├── handleBoundsChange(bbox)     → debounced 600ms, fires on map moveend/zoomend
  │     └── loadLayer() → overpass.ts → Overpass API or localStorage cache
  ├── MapData state                → { camping, agua, rutas, eventos, wikipedia }
  ├── Map.tsx                      → Leaflet rendering + MapBoundsTracker + clusters
  ├── LayerPanel.tsx               → layer toggles, cache status, refresh
  └── BottomSheet.tsx              → feature detail modal (layer-specific renderers)
```

### Dynamic bbox loading

The map fetches data for the **current viewport**, not a fixed area. `MapBoundsTracker` (inside `MapContainer`) fires `onBoundsChange(bbox)` on every `moveend`/`zoomend`, with a minimum zoom of 9. `page.tsx` debounces 600ms then calls Overpass with that bbox.

Cache is keyed by layer + bbox (stored in the `StoredEntry`). Moving to a new area invalidates the cache for that layer and triggers a fresh fetch.

### Layer system

Defined in `src/types/layers.ts`. Each layer has `enabled` (default on/off) and `implemented` (false = "coming soon" UI).

- **Functional:** `camping`, `agua`, `rutas` — fetch from Overpass, rendered as Leaflet markers/polylines
- **Placeholder:** `wikipedia`, `clima`, `eventos` — shown in LayerPanel as coming soon; `eventos`/`wikipedia` use mock GeoJSON from `src/data/mock.ts`

### z-index layers

Leaflet uses z-indices 200–800 internally. All UI overlays must be **above 1000**:
- Header, loading indicator, legend pills: `z-[1000]`
- LayerPanel backdrop / BottomSheet backdrop: `z-[1001]`
- LayerPanel panel / BottomSheet sheet: `z-[1002]`

### Key conventions

- `@/*` → `./src/*` (tsconfig path alias)
- All components use `"use client"` — fully client-rendered despite App Router
- `Map.tsx` is lazy-loaded with `dynamic(() => ..., { ssr: false })`
- `Set<LayerId>` (not arrays) for tracking enabled layers
- Empty results are never written to cache (prevents stale empty cache)

## Planned layers (backlog)

OSM tags available, same architecture as existing layers:

| Layer | OSM tags |
|-------|----------|
| Centros médicos | `amenity=hospital/clinic/doctors/pharmacy` |
| WC públicos | `amenity=toilets` |
| Supermercados | `shop=supermarket/convenience` |
| Gasolineras | `amenity=fuel` |
| Bibliotecas | `amenity=library` |
| Parking camper | `amenity=parking` + `motorhome=yes` |
| Vaciado caravanas | `amenity=sanitary_dump_station` |
| Carga eléctrica | `amenity=charging_station` |
| WiFi público | `internet_access=wlan` + `internet_access:fee=no` |

**Precios gasolina** — OSM no tiene precios. Usar la API del Ministerio de Industria (España): `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/` — gratuita, sin API key, actualizada cada 2h.

## Pending features

- Búsqueda por nombre (Nominatim API — gratuito)
- Wikipedia real (Wikipedia Geosearch API)
- Clima (OpenWeatherMap — requiere API key gratuita)
- Exportar favoritos (GPX/KMZ)
