export type LayerId =
  | "camping"
  | "rutas"
  | "wikipedia"
  | "clima"
  | "eventos"
  | "agua";

export interface Layer {
  id: LayerId;
  label: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;   // default on/off
  implemented: boolean; // false = coming soon, not interactive
  source: string;
  comingSoon?: string; // short description of what's planned
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
  },
  {
    id: "wikipedia",
    label: "Lugares de interés",
    description: "POIs geolocalizados desde Wikipedia",
    icon: "📖",
    color: "#a855f7",
    enabled: false,
    implemented: false,
    source: "Wikipedia API",
    comingSoon: "Sprint 3",
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
    comingSoon: "Sprint 4",
  },
];
