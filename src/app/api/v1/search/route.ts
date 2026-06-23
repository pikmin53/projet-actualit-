import { NextRequest, NextResponse } from "next/server";
import { withPublicApi, publicApiOptionsHandler } from "@/lib/api/withPublicApi";
import { listArticles } from "@/lib/db/queries";

/**
 * GET /api/v1/search?q=...
 * Recherche texte simple sur le titre, le résumé et le lieu des articles.
 * Query params : q (obligatoire), limit (défaut 50, max 200).
 * Voir docs/api.md.
 */
export const GET = withPublicApi(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "Le paramètre de requête 'q' est obligatoire." }, { status: 400 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50, 200);
  const articles = await listArticles({ search: q.trim(), limit });

  return NextResponse.json({ query: q, articles });
});

export const OPTIONS = publicApiOptionsHandler;
