# CamperMap

Mapa interactivo para camping, senderismo y viaje en furgoneta. Datos en tiempo real de OpenStreetMap.

**Demo:** https://camper-map.vercel.app

## Qué hace

- Muestra campings, bivouacs, fuentes de agua y senderos del área visible del mapa
- Descarga automáticamente los datos al desplazarte a una nueva zona
- Caché local de 24h — funciona sin conexión una vez descargado
- Clustering de puntos con recuento visible
- Iconos por tipo (⛺ camping, 🚐 área camper, 🌲 bivouac, 🏠 refugio, 💧 agua potable…)
- Ficha de detalle al pulsar cualquier punto
- Geolocalización

## Stack

- **Next.js 15** + React 19 + TypeScript
- **Leaflet** + react-leaflet + react-leaflet-cluster
- **Tailwind CSS 4**
- **OpenStreetMap** via Overpass API (datos gratuitos)

## Desarrollo local

```bash
npm install
npm run dev       # http://localhost:3000
```

```bash
npm run build     # build de producción
npm run lint      # ESLint
```

## Estructura

```
src/
├── app/          # Next.js App Router (page.tsx es el orchestrator)
├── components/   # Map, LayerPanel, BottomSheet
├── hooks/        # usePersistedLayers
├── lib/          # overpass.ts — fetch + caché
├── types/        # layers.ts — definición y configuración de capas
└── data/         # mock.ts — datos estáticos para capas no implementadas
```

## Capas disponibles

| Capa | Fuente | Estado |
|------|--------|--------|
| ⛺ Camping & Bivouac | OpenStreetMap | ✅ |
| 💧 Fuentes de agua | OpenStreetMap | ✅ |
| 🥾 Rutas & Senderos | OpenStreetMap | ✅ |
| 📖 Lugares de interés | Wikipedia API | 🔜 Sprint 3 |
| 🌤 Clima | OpenWeatherMap | 🔜 Sprint 3 |
| 🎉 Eventos & Fiestas | — | 🔜 Sprint 4 |

## Próximas capas planificadas

Centros médicos · WC públicos · Supermercados · Gasolineras (con precios vía API Ministerio) · Bibliotecas · Parking camper · Vaciado caravanas · Carga eléctrica

## Deploy

Push a `main` → Vercel despliega automáticamente.

---

Datos © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) — [ODbL](https://opendatacommons.org/licenses/odbl/)
