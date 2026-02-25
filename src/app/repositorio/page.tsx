"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useActiveRepos } from "@/hooks/useActiveRepos";
import type { RepoMeta } from "@/app/api/repos/upload/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "ahora mismo";
  if (m < 60) return `hace ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

// ─── Upload form ──────────────────────────────────────────────────────────────

function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [file, setFile]         = useState<File | null>(null);
  const [name, setName]         = useState("");
  const [description, setDesc]  = useState("");
  const [author, setAuthor]     = useState("Iván");
  const [status, setStatus]     = useState<"idle" | "uploading" | "ok" | "error">("idle");
  const [message, setMessage]   = useState("");
  const dropRef                 = useRef<HTMLDivElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".csv") || f.type === "text/csv")) {
      setFile(f);
      if (!name) setName(f.name.replace(/\.csv$/i, ""));
    }
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setStatus("uploading");
    setMessage("");

    const form = new FormData();
    form.append("file", file);
    form.append("name", name || file.name.replace(/\.csv$/i, ""));
    form.append("description", description);
    form.append("author", author);

    try {
      const res = await fetch("/api/repos/upload", { method: "POST", body: form });
      const data = await res.json() as { id?: string; count?: number; skipped?: number; error?: string };

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Error desconocido");
      } else {
        setStatus("ok");
        setMessage(`✓ ${data.count} elementos subidos${data.skipped ? ` (${data.skipped} filas omitidas)` : ""}`);
        setFile(null);
        setName("");
        setDesc("");
        onSuccess();
      }
    } catch {
      setStatus("error");
      setMessage("Error de red al subir el archivo");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => document.getElementById("csv-input")?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          file ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-gray-300 bg-gray-50"
        }`}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setFile(f); if (!name) setName(f.name.replace(/\.csv$/i, "")); }
          }}
        />
        {file ? (
          <div>
            <p className="font-medium text-green-700 text-sm">📄 {file.name}</p>
            <p className="text-xs text-green-600 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="text-2xl mb-2">📂</p>
            <p className="text-sm font-medium text-gray-600">Arrastra un CSV aquí o pulsa para seleccionar</p>
            <p className="text-xs text-gray-400 mt-1">Columnas necesarias: lat, lon, name</p>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre de la capa</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mi capa personalizada"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Descripción <span className="normal-case text-gray-400">(opcional)</span></label>
          <input
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descripción de qué contiene esta capa"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Autor</label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Iván"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Feedback */}
      {message && (
        <p className={`text-sm px-3 py-2 rounded-lg ${status === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={!file || status === "uploading"}
        className="w-full py-2.5 rounded-xl bg-green-500 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
      >
        {status === "uploading" ? "Subiendo…" : "Subir capa"}
      </button>

      {/* CSV format hint */}
      <details className="text-xs text-gray-400">
        <summary className="cursor-pointer hover:text-gray-600">Ver formato CSV esperado</summary>
        <pre className="mt-2 bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-600 leading-relaxed">{`lat,lon,name,type,description,url,image,notes
40.6234,-0.1023,Morella,castillo,"Ciudad medieval",,https://...,Buena pernocta
40.3639,0.4041,Peñíscola,castillo,"Castillo del Papa Luna",,, `}</pre>
        <p className="mt-1">También acepta <strong>;</strong> como separador y columnas en español (latitud, longitud, nombre…).</p>
      </details>
    </form>
  );
}

// ─── Repo card ────────────────────────────────────────────────────────────────

function RepoCard({
  repo,
  active,
  onToggle,
  onDelete,
}: {
  repo: RepoMeta;
  active: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${repo.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/repos/${repo.id}`, { method: "DELETE" });
      onDelete();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${active ? "border-green-300 bg-green-50" : "border-gray-100 bg-white"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">{repo.name}</span>
          {active && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Activa</span>}
        </div>
        {repo.description && (
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{repo.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          por <strong>{repo.author}</strong> · {repo.count} elementos · {timeAgo(repo.uploadedAt)}
          {repo.skipped > 0 && ` · ${repo.skipped} omitidas`}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggle}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            active
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {active ? "Desactivar" : "Activar"}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RepositorioPage() {
  const { activeRepos, toggleRepo, removeRepo } = useActiveRepos();
  const [repos, setRepos]     = useState<RepoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<"list" | "upload">("list");

  const loadRepos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/repos/list");
      const data = await res.json() as RepoMeta[];
      setRepos(data.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
    } catch {
      setRepos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRepos(); }, [loadRepos]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
          ← Mapa
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900 text-base">Repositorio de capas</h1>
          <p className="text-xs text-gray-400">Sube y gestiona tus capas CSV personalizadas</p>
        </div>
        <Link
          href="/"
          className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-600 transition-colors"
        >
          Ver en mapa →
        </Link>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Tab switcher */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          {(["list", "upload"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
                section === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s === "list" ? `📋 Capas disponibles${repos.length > 0 ? ` (${repos.length})` : ""}` : "⬆️ Subir CSV"}
            </button>
          ))}
        </div>

        {/* List section */}
        {section === "list" && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-2xl animate-pulse mb-2">📋</p>
                <p className="text-sm">Cargando capas…</p>
              </div>
            ) : repos.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-3">📂</p>
                <p className="text-sm font-medium">Todavía no hay capas</p>
                <p className="text-xs mt-1">Sube tu primer CSV para empezar</p>
                <button
                  onClick={() => setSection("upload")}
                  className="mt-4 text-sm text-green-600 font-medium hover:underline"
                >
                  Subir ahora →
                </button>
              </div>
            ) : (
              repos.map((repo) => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  active={activeRepos.includes(repo.id)}
                  onToggle={() => toggleRepo(repo.id)}
                  onDelete={() => {
                    removeRepo(repo.id);
                    setRepos((prev) => prev.filter((r) => r.id !== repo.id));
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* Upload section */}
        {section === "upload" && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <UploadForm onSuccess={() => { loadRepos(); setSection("list"); }} />
          </div>
        )}
      </div>
    </div>
  );
}
