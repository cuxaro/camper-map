import { unstable_cache } from "next/cache";
import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { fetchLayerFromOverpass, FUNCTIONAL_LAYER_IDS } from "@/lib/overpass-server";
import type { LayerId } from "@/types/layers";

function getCachedLayer(layerId: LayerId) {
  return unstable_cache(
    () => fetchLayerFromOverpass(layerId),
    [`campermap-layer-${layerId}`],
    { revalidate: 86400, tags: [`layer-${layerId}`] }
  )();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ layerId: string }> }
) {
  const { layerId } = await params;

  if (!FUNCTIONAL_LAYER_IDS.includes(layerId as LayerId)) {
    return Response.json({ error: "Layer not found" }, { status: 404 });
  }

  const id = layerId as LayerId;
  const force = req.nextUrl.searchParams.get("force") === "1";

  if (force) {
    revalidateTag(`layer-${id}`);
    const result = await fetchLayerFromOverpass(id);
    return Response.json(result);
  }

  const result = await getCachedLayer(id);
  return Response.json(result);
}
