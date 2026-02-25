"use client";

import { MapContainer, TileLayer, GeoJSON, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LayerId } from "@/types/layers";

const CASTELLON_CENTER: [number, number] = [40.1428, -0.0899];
const CASTELLON_ZOOM = 9;

const LAYER_COLORS: Record<LayerId, string> = {
  camping: "#22c55e",
  rutas: "#f97316",
  agua: "#38bdf8",
  wikipedia: "#a855f7",
  clima: "#facc15",
  eventos: "#f43f5e",
};

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export type MapData = Partial<Record<LayerId, GeoJSON.FeatureCollection>>;

interface MapProps {
  enabledLayers: Set<LayerId>;
  data: MapData;
  onFeatureClick: (feature: GeoJSON.Feature) => void;
}

const POINT_LAYERS: LayerId[] = ["camping", "agua", "eventos", "wikipedia"];

export default function Map({ enabledLayers, data, onFeatureClick }: MapProps) {
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

      {/* Point layers: camping, agua, eventos, wikipedia */}
      {POINT_LAYERS.map((id) => {
        if (!enabledLayers.has(id)) return null;
        const fc = data[id] ?? EMPTY_FC;
        return (
          <GeoJSON
            key={`${id}-${fc.features.length}`}
            data={fc}
            pointToLayer={(_feature, latlng) =>
              L.circleMarker(latlng, {
                radius: 8,
                fillColor: LAYER_COLORS[id],
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9,
              })
            }
            onEachFeature={(feature, layer) => {
              layer.on("click", () => onFeatureClick(feature as GeoJSON.Feature));
            }}
          />
        );
      })}

      {/* Rutas: line layer */}
      {enabledLayers.has("rutas") && (
        <GeoJSON
          key={`rutas-${(data.rutas ?? EMPTY_FC).features.length}`}
          data={data.rutas ?? EMPTY_FC}
          style={{
            color: LAYER_COLORS.rutas,
            weight: 2.5,
            opacity: 0.85,
          }}
          onEachFeature={(feature, layer) => {
            layer.on("click", () => onFeatureClick(feature as GeoJSON.Feature));
          }}
        />
      )}
    </MapContainer>
  );
}
