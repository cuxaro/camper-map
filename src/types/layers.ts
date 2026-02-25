export type LayerId =
  | "camping"
  | "rutas"
  | "wikipedia"
  | "wikidata"
  | "clima"
  | "eventos"
  | "agua"
  | "wc"
  | "ivan";

export type LayerGroup = "dormir" | "hacer" | "basicos" | "recomendaciones";

export const LAYER_GROUPS: { id: LayerGroup; label: string }[] = [
  { id: "dormir",          label: "🛏 Dónde dormir" },
  { id: "hacer",           label: "🎒 Qué hacer" },
  { id: "basicos",         label: "🔧 Básicos" },
  { id: "recomendaciones", label: "⭐ Recomendaciones" },
];

export interface Layer {
  id: LayerId;
  label: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  implemented: boolean;
  source: string;
  group: LayerGroup;
  comingSoon?: string;
}

export const LAYERS: Layer[] = [
  {
    id: "camping",
    label: "Camping & Bivouac",
    description: "Spots libres, campings y zonas de acampada",
    icon: "⛺",
    color: "#22c55e",
    enabled: true,
    implemented: true,
    source: "OpenStreetMap",
    group: "dormir",
  },
  {
    id: "rutas",
    label: "Rutas & Senderos",
    description: "Rutas de senderismo y caminos marcados",
    icon: "🥾",
    color: "#f97316",
    enabled: true,
    implemented: true,
    source: "OpenStreetMap",
    group: "hacer",
  },
  {
    id: "wikipedia",
    label: "Lugares de interés",
    description: "POIs geolocalizados desde Wikipedia (es+ca)",
    icon: "📖",
    color: "#a855f7",
    enabled: false,
    implemented: true,
    source: "Wikipedia (es/ca)",
    group: "hacer",
  },
  {
    id: "wikidata",
    label: "Patrimonio",
    description: "Castillos, iglesias, museos y monumentos",
    icon: "🏛",
    color: "#0ea5e9",
    enabled: false,
    implemented: true,
    source: "Wikidata",
    group: "hacer",
  },
  {
    id: "agua",
    label: "Fuentes de agua",
    description: "Fuentes, manantiales y agua potable",
    icon: "💧",
    color: "#38bdf8",
    enabled: false,
    implemented: true,
    source: "OpenStreetMap",
    group: "basicos",
  },
  {
    id: "wc",
    label: "WC Públicos",
    description: "Servicios higiénicos públicos",
    icon: "🚽",
    color: "#64748b",
    enabled: false,
    implemented: true,
    source: "OpenStreetMap",
    group: "basicos",
  },
  {
    id: "ivan",
    label: "Recomendación Iván",
    description: "Cementerios y bibliotecas — pernocta tranquila garantizada",
    icon: "🎯",
    color: "#ef4444",
    enabled: false,
    implemented: true,
    source: "OpenStreetMap",
    group: "recomendaciones",
  },
  {
    id: "clima",
    label: "Clima",
    description: "Mapa de temperatura y precipitación",
    icon: "🌤",
    color: "#facc15",
    enabled: false,
    implemented: false,
    source: "OpenWeatherMap",
    group: "hacer",
    comingSoon: "Sprint 3",
  },
  {
    id: "eventos",
    label: "Eventos & Fiestas",
    description: "Fiestas locales, mercados y eventos",
    icon: "🎉",
    color: "#f43f5e",
    enabled: false,
    implemented: false,
    source: "Mock data",
    group: "hacer",
    comingSoon: "Sprint 4",
  },
];
