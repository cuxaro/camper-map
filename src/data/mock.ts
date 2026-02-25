import type { GeoJSON } from "geojson";

// Castellón bounding box aprox: lat 39.8-40.8, lng -0.6-0.5

export const campingData: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-0.0476, 40.1422] },
      properties: {
        id: "c1",
        name: "Zona de bivouac Penyagolosa",
        type: "bivouac",
        description: "Zona libre junto al Penyagolosa. Sin servicios, naturaleza pura.",
        tags: ["libertad", "montaña", "sin-servicios"],
        rating: 4.8,
        water: false,
        electricity: false,
        verified: true,
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-0.3892, 39.9923] },
      properties: {
        id: "c2",
        name: "Área de descanso Rambla Seca",
        type: "area",
        description: "Zona habilitada para furgonetas. Agua disponible en verano.",
        tags: ["furgoneta", "agua", "gratuito"],
        rating: 3.9,
        water: true,
        electricity: false,
        verified: true,
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0.0231, 40.3678] },
      properties: {
        id: "c3",
        name: "Spot río Mijares",
        type: "bivouac",
        description: "Junto al río, sombra garantizada. Ideal para verano.",
        tags: ["río", "sombra", "verano"],
        rating: 4.5,
        water: true,
        electricity: false,
        verified: false,
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-0.1056, 40.5234] },
      properties: {
        id: "c4",
        name: "Llano del Regajo",
        type: "bivouac",
        description: "Meseta tranquila, vistas increíbles al amanecer. Acceso 4x4 recomendado.",
        tags: ["4x4", "vistas", "silencio"],
        rating: 4.9,
        water: false,
        electricity: false,
        verified: true,
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0.1245, 40.0156] },
      properties: {
        id: "c5",
        name: "Camping Serra d'Irta",
        type: "camping",
        description: "Camping oficial en Parque Natural. Reserva recomendada en verano.",
        tags: ["oficial", "parque-natural", "reserva"],
        rating: 4.2,
        water: true,
        electricity: true,
        verified: true,
      },
    },
  ],
};

export const aguaData: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-0.0512, 40.1398] },
      properties: {
        id: "a1",
        name: "Fuente del Penyagolosa",
        type: "fountain",
        potable: true,
        permanent: true,
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0.0198, 40.3701] },
      properties: {
        id: "a2",
        name: "Fuente Río Mijares",
        type: "river",
        potable: false,
        permanent: true,
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-0.3845, 39.9987] },
      properties: {
        id: "a3",
        name: "Fuente Camino Rural",
        type: "fountain",
        potable: true,
        permanent: false,
      },
    },
  ],
};

export const eventosData: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-0.0899, 39.9864] },
      properties: {
        id: "e1",
        name: "Fiestas de la Magdalena",
        date: "2026-03-13",
        category: "fiesta",
        description: "Fiestas fundacionales de Castelló de la Plana. Declaradas de Interés Turístico Internacional.",
        url: "",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-0.1023, 40.6234] },
      properties: {
        id: "e2",
        name: "Fira de Morella",
        date: "2026-04-20",
        category: "mercado",
        description: "Mercado medieval en el casco histórico de Morella.",
        url: "",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0.2134, 39.9812] },
      properties: {
        id: "e3",
        name: "Festival de música Peñíscola",
        date: "2026-07-15",
        category: "musica",
        description: "Conciertos al aire libre junto al castillo templario.",
        url: "",
      },
    },
  ],
};

export const wikipediaData: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-0.1023, 40.6234] },
      properties: {
        id: "w1",
        name: "Morella",
        summary: "Ciudad medieval amurallada declarada Bien de Interés Cultural. Domina el territorio desde su castillo del siglo XIII.",
        url: "https://es.wikipedia.org/wiki/Morella",
        thumbnail: "",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0.4041, 40.3639] },
      properties: {
        id: "w2",
        name: "Peñíscola",
        summary: "Ciudad en el mar. Castillo templario del Papa Luna en la Comunidad Valenciana.",
        url: "https://es.wikipedia.org/wiki/Pe%C3%B1%C3%ADscola",
        thumbnail: "",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-0.0476, 40.1422] },
      properties: {
        id: "w3",
        name: "Penyagolosa",
        summary: "Pico más alto de la Comunitat Valenciana (1.814 m). Parque Natural con fauna y flora endémica.",
        url: "https://es.wikipedia.org/wiki/Penyagolosa",
        thumbnail: "",
      },
    },
  ],
};
