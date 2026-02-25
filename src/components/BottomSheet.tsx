"use client";

import { useEffect, useRef } from "react";
import type { LayerId } from "@/types/layers";

interface BottomSheetProps {
  feature: GeoJSON.Feature | null;
  onClose: () => void;
}

type Props = Record<string, unknown>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span className="text-amber-400 text-sm">
      {"★".repeat(full)}
      {half ? "½" : ""}
      <span className="text-gray-300">{"★".repeat(5 - full - (half ? 1 : 0))}</span>
    </span>
  );
}

function Tag({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: "bg-gray-100 text-gray-500",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-600",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  );
}

function OsmLink({ osmId }: { osmId: string }) {
  if (!osmId) return null;
  return (
    <a
      href={`https://www.openstreetmap.org/${osmId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-gray-400 underline"
    >
      Ver en OSM
    </a>
  );
}

// ─── Detail components ────────────────────────────────────────────────────────

function CampingDetail({ props }: { props: Props }) {
  const typeLabel: Record<string, string> = {
    camping: "Camping",
    area: "Área camper",
    bivouac: "Bivouac libre",
    refugio: "Refugio",
    picnic: "Área picnic",
  };

  const rating = typeof props.rating === "number" ? props.rating : null;
  const tags = Array.isArray(props.tags) ? (props.tags as string[]) : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Tag color="green">{typeLabel[String(props.type ?? "")] ?? "Camping"}</Tag>
        {!!props.verified && <Tag color="blue">✓ Verificado</Tag>}
        {!!props.fee && <Tag color="orange">💶 De pago</Tag>}
      </div>

      {rating !== null && (
        <div className="flex items-center gap-2">
          <Stars rating={rating} />
          <span className="text-sm text-gray-500">{rating.toFixed(1)}</span>
        </div>
      )}

      {!!props.description && (
        <p className="text-sm text-gray-600 leading-relaxed">{String(props.description)}</p>
      )}

      <div className="flex gap-2 flex-wrap">
        <span className={`text-xs px-2 py-1 rounded-full ${props.water ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
          💧 {props.water ? "Agua" : "Sin agua"}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${props.electricity ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-400"}`}>
          ⚡ {props.electricity ? "Electricidad" : "Sin luz"}
        </span>
      </div>

      {tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {tags.map((tag) => (
            <Tag key={tag}>#{tag}</Tag>
          ))}
        </div>
      )}

      {!!props.website && (
        <a href={String(props.website)} target="_blank" rel="noopener noreferrer"
          className="text-sm text-green-600 font-medium">
          🌐 Web →
        </a>
      )}

      <OsmLink osmId={String(props._osmId ?? "")} />
    </div>
  );
}

function AguaDetail({ props }: { props: Props }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <span className={`text-xs px-2 py-1 rounded-full ${props.potable ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
          {props.potable ? "✓ Potable" : "⚠ No potable"}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${props.permanent ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
          {props.permanent ? "✓ Permanente" : "⚠ Temporal"}
        </span>
      </div>
      {!!props.flow && (
        <p className="text-sm text-gray-500">Caudal: {String(props.flow)}</p>
      )}
      <OsmLink osmId={String(props._osmId ?? "")} />
    </div>
  );
}

function RutaDetail({ props }: { props: Props }) {
  const sacLabel: Record<string, string> = {
    hiking: "🟢 Senderismo fácil",
    mountain_hiking: "🟡 Montaña media",
    demanding_mountain_hiking: "🟠 Montaña exigente",
    alpine_hiking: "🔴 Alpino",
    demanding_alpine_hiking: "⚫ Alpino exigente",
  };

  return (
    <div className="space-y-3">
      {!!props.sac_scale && (
        <p className="text-sm font-medium">{sacLabel[String(props.sac_scale)] ?? String(props.sac_scale)}</p>
      )}
      {!!props.description && (
        <p className="text-sm text-gray-600 leading-relaxed">{String(props.description)}</p>
      )}
      <div className="flex gap-2 flex-wrap">
        {!!props.surface && <Tag>{String(props.surface)}</Tag>}
        {!!props.distance && <Tag color="green">📏 {String(props.distance)}</Tag>}
      </div>
      <OsmLink osmId={String(props._osmId ?? "")} />
    </div>
  );
}

function WikipediaDetail({ props }: { props: Props }) {
  return (
    <div className="space-y-3">
      {!!props.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={String(props.image)}
          alt={String(props.name ?? "")}
          className="w-full h-44 object-cover rounded-xl"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      {!!props.summary && (
        <p className="text-sm text-gray-600 leading-relaxed">{String(props.summary)}</p>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        {!!props.url && (
          <a href={String(props.url)} target="_blank" rel="noopener noreferrer"
            className="text-sm text-purple-600 font-medium">
            Ver en Wikipedia →
          </a>
        )}
        {props.lang === "ca" && (
          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Viquipèdia (ca)</span>
        )}
      </div>
    </div>
  );
}

function WikidataDetail({ props }: { props: Props }) {
  return (
    <div className="space-y-3">
      {!!props.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={String(props.image)}
          alt={String(props.name ?? "")}
          className="w-full h-44 object-cover rounded-xl"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      {!!props.type && (
        <Tag color="blue">{String(props.type)}</Tag>
      )}
      {!!props.url && (
        <a href={String(props.url)} target="_blank" rel="noopener noreferrer"
          className="text-sm text-sky-600 font-medium">
          Ver en Wikidata →
        </a>
      )}
    </div>
  );
}

function IvanDetail({ props }: { props: Props }) {
  const isCemetery = props.type === "cementerio";
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Tag color={isCemetery ? "gray" : "blue"}>
          {isCemetery ? "🪦 Cementerio" : "📚 Biblioteca"}
        </Tag>
        {isCemetery && <Tag color="green">🅿️ Parking habitual</Tag>}
        {!isCemetery && !!props.wifi && <Tag color="blue">📶 WiFi</Tag>}
      </div>
      {!!props.opening_hours && (
        <p className="text-sm text-gray-500">🕐 {String(props.opening_hours)}</p>
      )}
      {!!props.website && (
        <a href={String(props.website)} target="_blank" rel="noopener noreferrer"
          className="text-sm text-red-600 font-medium">
          🌐 Web →
        </a>
      )}
      <OsmLink osmId={String(props._osmId ?? "")} />
    </div>
  );
}

function EventoDetail({ props }: { props: Props }) {
  const catLabel: Record<string, string> = {
    fiesta: "🎊 Fiesta local",
    mercado: "🛒 Mercado",
    musica: "🎵 Música",
  };

  const fecha = props.date
    ? new Date(String(props.date)).toLocaleDateString("es-ES", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Tag color="red">{catLabel[String(props.category ?? "")] ?? String(props.category ?? "")}</Tag>
        {fecha && <span className="text-xs text-gray-500">📅 {fecha}</span>}
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{String(props.description ?? "")}</p>
    </div>
  );
}

// ─── Icon + component mapping by _layerId ─────────────────────────────────────

const LAYER_ICON: Record<LayerId, string> = {
  camping: "⛺",
  agua: "💧",
  rutas: "🥾",
  wikipedia: "📖",
  eventos: "🎉",
  clima: "🌤",
  wc: "🚽",
  ivan: "🎯",
  wikidata: "🏛",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function BottomSheet({ feature, onClose }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feature) sheetRef.current?.scrollTo(0, 0);
  }, [feature]);

  if (!feature) return null;

  const props = (feature.properties ?? {}) as Props;
  const layerId = String(props._layerId ?? "") as LayerId;
  const icon = LAYER_ICON[layerId] ?? "📍";

  return (
    <>
      <div className="fixed inset-0 z-[1001]" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-[1002] bg-white rounded-t-2xl shadow-2xl max-h-[65vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 pb-3 pt-2 shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl">{icon}</span>
            <h2 className="font-bold text-gray-900 text-base leading-tight truncate">
              {String(props.name ?? "Sin nombre")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 ml-2"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div ref={sheetRef} className="overflow-y-auto px-4 py-4 flex-1">
          {layerId === "camping" && <CampingDetail props={props} />}
          {layerId === "agua" && <AguaDetail props={props} />}
          {layerId === "rutas" && <RutaDetail props={props} />}
          {layerId === "wikipedia" && <WikipediaDetail props={props} />}
          {layerId === "wikidata" && <WikidataDetail props={props} />}
          {layerId === "ivan" && <IvanDetail props={props} />}
          {layerId === "eventos" && <EventoDetail props={props} />}
        </div>
      </div>
    </>
  );
}
