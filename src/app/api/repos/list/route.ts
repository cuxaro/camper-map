import { list } from "@vercel/blob";
import type { RepoMeta, RepoPayload } from "@/app/api/repos/upload/route";

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json([], { status: 200 }); // return empty list, not an error
  }

  try {
    const { blobs } = await list({ prefix: "repos/", token: process.env.BLOB_READ_WRITE_TOKEN });

    const metas = await Promise.all(
      blobs.map(async (blob): Promise<RepoMeta | null> => {
        try {
          const res = await fetch(blob.url, { next: { revalidate: 60 } });
          if (!res.ok) return null;
          const payload = await res.json() as RepoPayload;
          return payload.meta;
        } catch {
          return null;
        }
      })
    );

    return Response.json(metas.filter(Boolean));
  } catch {
    return Response.json([], { status: 200 });
  }
}
