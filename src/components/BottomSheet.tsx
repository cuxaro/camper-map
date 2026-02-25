"use client";

import { useEffect, useRef } from "react";

interface BottomSheetProps {
  feature: GeoJSON.Feature | null;
  onClose: () => void;
}

type Props = Record<string, unknown>;

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const partial = rating % 1 >= 0.5;
  return (
    <span className="text-amber-400 text-sm">
      {"★".repeat(full)}
      {partial ? "½" : ""}
      <span className="text-gray-300">{"★".repeat(5 - full - (partial ? 1 : 0))}</span>
    </span>
  );
}

function CampingDetail({ props }: { props: Props }) {
  const typeLabel: Record<string, string> = {
    camping: "Camping oficial",
    bivouac: "Bivouac libre",
    area: "Área de descanso",
  };

  const rating = typeof props.rating === "number" ? props.rating : null;
  const tags = Array.isArray(props.tags) ? (props.tags as string[]) : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          {typeLabel[String(props.type)] ?? String(props.type)}
        </span>
        {!!props.verified && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            ✓ Verificado
          </span>
        )}
      </div>

      {rating !== null && (
        <div className="flex items-center gap-2">
          {renderStars(rating)}
          <span className="text-sm text-gray-500">{rating.toFixed(1)}</span>
        </div>
      )}

      <p className="text-sm text-gray-600 leading-relaxed">{String(props.description ?? "")}</p>

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
            <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function WikipediaDetail({ props }: { props: Props }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">{String(props.summary ?? "")}</p>
      {!!props.url && (
        <a
          href={String(props.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-purple-600 font-medium"
        >
          Ver en Wikipedia →
        </a>
      )}
    </div>
  );
}

function EventoDetail({ props }: { props: Props }) {
  const categoryLabel: Record<string, string> = {
    fiesta: "🎊 Fiesta local",
    mercado: "🛒 Mercado",
    musica: "🎵 Música",
  };

  const fecha = props.date
    ? new Date(String(props.date)).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
          {categoryLabel[String(props.category)] ?? String(props.category)}
        </span>
        {fecha && (
          <span className="text-xs text-gray-500">📅 {fecha}</span>
        )}
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{String(props.description ?? "")}</p>
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
    </div>
  );
}

export default function BottomSheet({ feature, onClose }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feature && sheetRef.current) {
      sheetRef.current.scrollTop = 0;
    }
  }, [feature]);

  if (!feature) return null;

  const props = (feature.properties ?? {}) as Props;
  const id = String(props.id ?? "");
  const source = id.charAt(0);

  const iconMap: Record<string, string> = {
    c: "⛺",
    a: "💧",
    e: "🎉",
    w: "📖",
  };

  const icon = iconMap[source] ?? "📍";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-10" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl max-h-[65vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 pb-3 pt-2 shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl">{icon}</span>
            <h2 className="font-bold text-gray-900 text-base leading-tight">
              {String(props.name ?? "")}
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
          {source === "c" && <CampingDetail props={props} />}
          {source === "w" && <WikipediaDetail props={props} />}
          {source === "e" && <EventoDetail props={props} />}
          {source === "a" && <AguaDetail props={props} />}
        </div>
      </div>
    </>
  );
}
