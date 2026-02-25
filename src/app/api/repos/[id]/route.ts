import { list, del } from "@vercel/blob";
import type { RepoPayload } from "@/app/api/repos/upload/route";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Blob storage no configurado" }, { status: 503 });
  }

  try {
    const { blobs } = await list({ prefix: `repos/${id}.json` });
    if (blobs.length === 0) return Response.json({ error: "No encontrado" }, { status: 404 });

    const res = await fetch(blobs[0].url);
    if (!res.ok) return Response.json({ error: "Error al leer el blob" }, { status: 500 });

    const payload = await res.json() as RepoPayload;
    return Response.json(payload.data);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Blob storage no configurado" }, { status: 503 });
  }

  try {
    const { blobs } = await list({ prefix: `repos/${id}.json` });
    if (blobs.length === 0) return Response.json({ error: "No encontrado" }, { status: 404 });

    await del(blobs[0].url);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
