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
  enabled: boolean;
  source: string;
}

export const LAYERS: Layer[] = [
  {
    id: "camping",
    label: "Camping & Bivouac",
    description: "Spots libres, campings y zonas de acampada",
    icon: "⛺",
    color: "#22c55e",
    enabled: true,
    source: "OpenStreetMap",
  },
  {
    id: "rutas",
    label: "Rutas & Senderos",
    description: "Rutas de senderismo, ciclismo y moto",
    icon: "🥾",
    color: "#f97316",
    enabled: true,
    source: "OpenStreetMap",
  },
  {
    id: "agua",
    label: "Fuentes de agua",
    description: "Fuentes, ríos y puntos de agua potable",
    icon: "💧",
    color: "#38bdf8",
    enabled: false,
    source: "OpenStreetMap",
  },
  {
    id: "wikipedia",
    label: "Lugares de interés",
    description: "POIs geolocalizados desde Wikipedia",
    icon: "📖",
    color: "#a855f7",
    enabled: false,
    source: "Wikipedia",
  },
  {
    id: "clima",
    label: "Clima",
    description: "Mapa de temperatura y precipitación",
    icon: "🌤",
    color: "#facc15",
    enabled: false,
    source: "OpenWeatherMap",
  },
  {
    id: "eventos",
    label: "Eventos & Fiestas",
    description: "Fiestas locales, mercados y eventos",
    icon: "🎉",
    color: "#f43f5e",
    enabled: false,
    source: "Mock data",
  },
];
