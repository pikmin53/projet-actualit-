import { NextRequest, NextResponse } from "next/server";
import { withPublicApi, publicApiOptionsHandler } from "@/lib/api/withPublicApi";
import { getArticleById } from "@/lib/db/queries";

/**
 * GET /api/v1/articles/:id
 * Renvoie un article avec sa source et son cluster d'évènement (articles liés des autres
 * sources + interprétation neutre). 404 si l'id n'existe pas. Voir docs/api.md.
 */
export const GET = withPublicApi(async (req: NextRequest) => {
  const id = req.nextUrl.pathname.split("/").pop()!;
  const article = await getArticleById(id);

  if (!article) {
    return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  }

  const interpretation = article.eventCluster ? JSON.parse(article.eventCluster.interpretationRaw) : null;

  return NextResponse.json({
    article: {
      ...article,
      eventCluster: article.eventCluster ? { ...article.eventCluster, interpretation } : null,
    },
  });
});

export const OPTIONS = publicApiOptionsHandler;
