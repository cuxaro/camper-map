import { put } from "@vercel/blob";
import { NextRequest } from "next/server";
import { parseCsv, rowsToGeoJSON } from "@/lib/csv-parser";
import { randomUUID } from "crypto";

export interface RepoMeta {
  id: string;
  name: string;
  description: string;
  author: string;
  uploadedAt: string;
  count: number;
  skipped: number;
}

export interface RepoPayload {
  meta: RepoMeta;
  data: GeoJSON.FeatureCollection;
}

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Blob storage no configurado. Añade BLOB_READ_WRITE_TOKEN al entorno." },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Error al leer el formulario" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No se recibió ningún archivo" }, { status: 400 });

  if (file.size > 5 * 1024 * 1024) {
    return Response.json({ error: "El archivo supera el límite de 5 MB" }, { status: 413 });
  }

  const repoName   = ((formData.get("name")        as string) || "").trim() || "Sin nombre";
  const repoDesc   = ((formData.get("description") as string) || "").trim();
  const author     = ((formData.get("author")      as string) || "").trim() || "Anónimo";

  const text = await file.text();
  const { valid, skipped, errors } = parseCsv(text);

  if (errors.length > 0) {
    return Response.json({ error: errors.join(". ") }, { status: 422 });
  }
  if (valid.length === 0) {
    return Response.json({ error: "No se encontraron filas válidas. Revisa que lat/lon/name estén correctos." }, { status: 422 });
  }

  const id = randomUUID();
  const geojson = rowsToGeoJSON(valid, id);

  const payload: RepoPayload = {
    meta: { id, name: repoName, description: repoDesc, author, uploadedAt: new Date().toISOString(), count: valid.length, skipped },
    data: geojson,
  };

  await put(`repos/${id}.json`, JSON.stringify(payload), {
    access: "public",
    contentType: "application/json",
  });

  return Response.json({ id, count: valid.length, skipped });
}
