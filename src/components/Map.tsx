"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, GeoJSON, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LayerId } from "@/types/layers";

const CASTELLON_CENTER: [number, number] = [40.1428, -0.0899];
const CASTELLON_ZOOM = 9;

const LAYER_COLORS: Record<LayerId, string> = {
  camping:    "#22c55e",
  rutas:      "#f97316",
  agua:       "#38bdf8",
  wikipedia:  "#a855f7",
  clima:      "#facc15",
  eventos:    "#f43f5e",
  wc:         "#64748b",
  biblioteca: "#7c3aed",
};

const CAMPING_EMOJI: Record<string, string> = {
  camping: "⛺",
  area: "🚐",
  bivouac: "🌲",
  refugio: "🏠",
  picnic: "🧺",
};

function makeIcon(layerId: LayerId, props: Record<string, unknown>): L.DivIcon {
  const color = LAYER_COLORS[layerId];
  let emoji: string;
  switch (layerId) {
    case "camping": emoji = CAMPING_EMOJI[String(props.type ?? "")] ?? "⛺"; break;
    case "rutas":      emoji = "🥾"; break;
    case "agua":       emoji = props.potable ? "💧" : "🚱"; break;
    case "eventos":    emoji = "🎉"; break;
    case "wikipedia":  emoji = "📖"; break;
    case "wc":         emoji = "🚽"; break;
    case "biblioteca": emoji = "📚"; break;
    default: emoji = "📍";
  }
  return L.divIcon({
    html: `<div style="background:${color};border:2px solid #fff;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,.3)">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    className: "",
  });
}

const MIN_ZOOM = 9;

function MapBoundsTracker({ onBoundsChange }: { onBoundsChange: (bbox: string, zoom: number) => void }) {
  const map = useMap();
  const cbRef = useRef(onBoundsChange);
  cbRef.current = onBoundsChange;
  const lastBboxRef = useRef<string>("");

  const fire = useCallback(() => {
    const zoom = map.getZoom();
    if (zoom < MIN_ZOOM) return;
    const b = map.getBounds();
    const bbox = [
      b.getSouth().toFixed(2),
      b.getWest().toFixed(2),
      b.getNorth().toFixed(2),
      b.getEast().toFixed(2),
    ].join(",");
    if (bbox === lastBboxRef.current) return; // sin cambio, no refetch
    lastBboxRef.current = bbox;
    cbRef.current(bbox, zoom);
  }, [map]);

  // dragend = solo cuando el usuario arrastra (no en movimientos del clustering)
  // zoomend = cuando el usuario hace zoom (scroll, botones, doble clic)
  useEffect(() => { fire(); }, [fire]);
  useMapEvents({ dragend: fire, zoomend: fire });

  return null;
}

function LocateButton() {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  useMapEvents({
    locationfound(e) {
      setLocating(false);
      map.flyTo(e.latlng, Math.max(map.getZoom(), 14));
    },
    locationerror() {
      setLocating(false);
    },
  });

  return (
    <div
      className="leaflet-bar leaflet-control"
      style={{ position: "absolute", bottom: 130, right: 10, zIndex: 1000 }}
    >
      <button
        onClick={() => { setLocating(true); map.locate(); }}
        title="Mi ubicación"
        style={{ width: 30, height: 30, border: "none", background: "white", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {locating ? "⌛" : "📍"}
      </button>
    </div>
  );
}

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
const POINT_LAYERS: LayerId[] = ["camping", "agua", "eventos", "wikipedia", "wc", "biblioteca"];

export type MapData = Partial<Record<LayerId, GeoJSON.FeatureCollection>>;

interface MapProps {
  enabledLayers: Set<LayerId>;
  data: MapData;
  selectedFeature: GeoJSON.Feature | null;
  onFeatureClick: (feature: GeoJSON.Feature) => void;
  onBoundsChange: (bbox: string, zoom: number) => void;
}

export default function Map({ enabledLayers, data, selectedFeature, onFeatureClick, onBoundsChange }: MapProps) {
  return (
    <MapContainer
      center={CASTELLON_CENTER}
      zoom={CASTELLON_ZOOM}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />
      <ZoomControl position="bottomright" />
      <LocateButton />
      <MapBoundsTracker onBoundsChange={onBoundsChange} />

      {/* Point layers with clustering */}
      {POINT_LAYERS.map((id) => {
        if (!enabledLayers.has(id)) return null;
        const features = (data[id] ?? EMPTY_FC).features;
        return (
          <MarkerClusterGroup key={id} chunkedLoading maxClusterRadius={50} disableClusteringAtZoom={13}>
            {features.map((feature) => {
              if (feature.geometry.type !== "Point") return null;
              const [lon, lat] = feature.geometry.coordinates;
              const props = (feature.properties ?? {}) as Record<string, unknown>;
              return (
                <Marker
                  key={String(props._osmId ?? `${lat},${lon}`)}
                  position={[lat, lon]}
                  icon={makeIcon(id, props)}
                  eventHandlers={{ click: () => onFeatureClick(feature) }}
                />
              );
            })}
          </MarkerClusterGroup>
        );
      })}

      {/* Rutas: trailhead marker at start of each route */}
      {enabledLayers.has("rutas") && (
        <MarkerClusterGroup key="rutas" chunkedLoading maxClusterRadius={50} disableClusteringAtZoom={13}>
          {(data.rutas ?? EMPTY_FC).features.map((feature) => {
            if (feature.geometry.type !== "LineString") return null;
            const [lon, lat] = feature.geometry.coordinates[0];
            const props = (feature.properties ?? {}) as Record<string, unknown>;
            return (
              <Marker
                key={String(props._osmId ?? `${lat},${lon}`)}
                position={[lat, lon]}
                icon={makeIcon("rutas", props)}
                eventHandlers={{ click: () => onFeatureClick(feature) }}
              />
            );
          })}
        </MarkerClusterGroup>
      )}

      {/* Active route line — only shown when a ruta is selected */}
      {selectedFeature?.properties?._layerId === "rutas" &&
        selectedFeature.geometry.type === "LineString" && (
          <GeoJSON
            key={`active-ruta-${String(selectedFeature.properties._osmId)}`}
            data={{ type: "FeatureCollection", features: [selectedFeature] } as GeoJSON.FeatureCollection}
            style={{ color: LAYER_COLORS.rutas, weight: 3, opacity: 0.9 }}
          />
        )}
    </MapContainer>
  );
}
