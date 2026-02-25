export interface CsvRow {
  lat: number;
  lon: number;
  name: string;
  type?: string;
  description?: string;
  url?: string;
  image?: string;
  notes?: string;
}

export interface ParseResult {
  valid: CsvRow[];
  skipped: number;
  errors: string[];
}

// ─── CSV line parser (handles quoted fields) ──────────────────────────────────

function parseLine(line: string, sep: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === sep && !inQ) {
      cols.push(cur.trim()); cur = "";
    } else {
      cur += c;
    }
  }
  cols.push(cur.trim());
  return cols;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function parseCsv(text: string): ParseResult {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .split("\n").map(l => l.trim()).filter(Boolean);

  if (lines.length < 2) return { valid: [], skipped: 0, errors: ["CSV vacío o sin filas de datos"] };

  // Detect separator
  const sep = lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";

  // Parse header — normalize to lowercase, strip BOM and quotes
  const headers = parseLine(lines[0].replace(/^\uFEFF/, ""), sep)
    .map(h => h.toLowerCase().replace(/['"]/g, "").trim());

  const col = (aliases: string[]) => headers.findIndex(h => aliases.includes(h));

  const latIdx  = col(["lat", "latitude", "latitud"]);
  const lonIdx  = col(["lon", "lng", "longitude", "longitud"]);
  const nameIdx = col(["name", "nombre", "title", "titulo", "nom"]);

  const errors: string[] = [];
  if (latIdx  === -1) errors.push("Columna 'lat' no encontrada");
  if (lonIdx  === -1) errors.push("Columna 'lon' no encontrada");
  if (nameIdx === -1) errors.push("Columna 'name' no encontrada");
  if (errors.length) return { valid: [], skipped: 0, errors };

  const typeIdx  = col(["type", "tipo", "categoria", "categoría"]);
  const descIdx  = col(["description", "descripcion", "descripción", "desc"]);
  const urlIdx   = col(["url", "web", "website", "enlace"]);
  const imageIdx = col(["image", "imagen", "foto", "photo", "img"]);
  const notesIdx = col(["notes", "notas", "comentarios", "comments"]);

  const valid: CsvRow[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i], sep);
    const lat  = parseFloat(cols[latIdx]  ?? "");
    const lon  = parseFloat(cols[lonIdx]  ?? "");
    const name = cols[nameIdx]?.replace(/^["']|["']$/g, "").trim() ?? "";

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || !name) {
      skipped++;
      continue;
    }

    const get = (idx: number) => idx >= 0 ? cols[idx]?.replace(/^["']|["']$/g, "").trim() || undefined : undefined;

    valid.push({ lat, lon, name, type: get(typeIdx), description: get(descIdx), url: get(urlIdx), image: get(imageIdx), notes: get(notesIdx) });
  }

  return { valid, skipped, errors: [] };
}

export function rowsToGeoJSON(rows: CsvRow[], repoId: string): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: rows.map((row, i) => ({
      type: "Feature",
      id: i,
      geometry: { type: "Point", coordinates: [row.lon, row.lat] },
      properties: {
        _repoId: repoId,
        name: row.name,
        type: row.type ?? "",
        description: row.description ?? "",
        url: row.url ?? "",
        image: row.image ?? "",
        notes: row.notes ?? "",
      },
    })),
  };
}
