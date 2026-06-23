import { NextRequest, NextResponse } from "next/server";
import { withPublicApi, publicApiOptionsHandler } from "@/lib/api/withPublicApi";
import { getClusterById } from "@/lib/db/queries";

/**
 * GET /api/v1/clusters/:id
 * Renvoie un cluster d'évènement (toutes les sources couvrant le même évènement) avec son
 * interprétation neutre. 404 si l'id n'existe pas. Voir docs/api.md.
 */
export const GET = withPublicApi(async (req: NextRequest) => {
  const id = req.nextUrl.pathname.split("/").pop()!;
  const cluster = await getClusterById(id);

  if (!cluster) {
    return NextResponse.json({ error: "Cluster introuvable." }, { status: 404 });
  }

  return NextResponse.json({
    cluster: { ...cluster, interpretation: JSON.parse(cluster.interpretationRaw) },
  });
});

export const OPTIONS = publicApiOptionsHandler;
